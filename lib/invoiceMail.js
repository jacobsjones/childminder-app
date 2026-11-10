import { Resend } from 'resend';
import { reserveUsage, releaseUsage, USAGE_KINDS } from '@/lib/usageLimits';

/** A name that is safe in a From header: no address or header syntax, at most 60 characters. */
export function safeDisplayName(value) {
    const name = String(value ?? '')
        .replace(/[<>"@,;:\\r\n]/g, ' ')
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
export async function sendInvoiceEmail({ userId, to, subject, html, text, pdfBytes, fileName, settings = {} }) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Email service is not configured on the server.');
    }
    if (typeof to !== 'string' || (to.match(/@/g) || []).length !== 1 || /[\s,;]/.test(to)) {
        throw new Error('Invalid recipient email address.');
    }

    const reservation = await reserveUsage(userId, USAGE_KINDS.invoiceEmail);

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: `${safeDisplayName(settings.businessName)} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to,
            ...(settings.businessEmail ? { replyTo: settings.businessEmail } : {}),
            subject,
            html,
            text,
            attachments: [{ filename: fileName, content: Buffer.from(pdfBytes) }],
        });
        if (error) throw new Error(error.message || 'unknown error');
        return data.id;
    } catch (error) {
        await releaseUsage(reservation);
        throw new Error(`Resend rejected the invoice email: ${error.message}`);
    }
}
