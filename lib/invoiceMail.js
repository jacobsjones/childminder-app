import { Resend } from 'resend';
import { reserveUsage, releaseUsage, USAGE_KINDS } from '@/lib/usageLimits';
import { ConfigError, InvalidRecipientError } from '@/lib/errors';

/** A name that is safe in a From header: no address or header syntax, at most 60 characters. */
export function safeDisplayName(value) {
    const name = String(value ?? '')
        .replace(/[<>"@,;:\\\x00-\x1f\x7f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
        .trim();
    return name || 'LittleHours';
}

/**
 * The only place an invoice email is sent. Counts against the daily limits
 * and always goes to a single address chosen by the caller (a stored child
 * email, never client-supplied). Returns the Resend message id.
 */
export async function sendInvoiceEmail({ userId, to, childName, subject, html, text, pdfBytes, fileName, settings = {} }) {
    if (!process.env.RESEND_API_KEY) {
        throw new ConfigError('Email service is not configured on the server.');
    }
    const recipient = typeof to === 'string' ? to.trim() : '';
    if ((recipient.match(/@/g) || []).length !== 1 || /[\s,;<>"]/.test(recipient) || recipient.startsWith('@') || recipient.endsWith('@')) {
        const who = childName || 'this child';
        throw new InvalidRecipientError(`The parent email for ${who} doesn't look right. Fix it on ${who}'s page and try again.`);
    }
    const safeSubject = String(subject ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();

    const reservation = await reserveUsage(userId, USAGE_KINDS.invoiceEmail);

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: `${safeDisplayName(settings.businessName)} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: recipient,
            ...(settings.businessEmail ? { replyTo: settings.businessEmail } : {}),
            subject: safeSubject,
            html,
            text,
            attachments: [{ filename: fileName, content: Buffer.from(pdfBytes) }],
        });
        if (error) throw new Error(error.message || 'unknown error');
        return data.id;
    } catch (error) {
        try {
            await releaseUsage(reservation);
        } catch (releaseError) {
            console.error('[Invoice mail] Could not release usage reservation:', releaseError);
        }
        throw new Error(`Resend rejected the invoice email: ${error.message}`);
    }
}
