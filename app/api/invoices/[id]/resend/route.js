import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { getInvoice, getSettings } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { buildInvoiceEmail } from '@/lib/invoiceEmail';
import { canRebuildInvoice, invoiceInputFromRecord, storedInvoiceFileName } from '@/lib/storedInvoice';

export const runtime = 'nodejs';

/**
 * Re-send a past invoice to the same parent.
 *
 * The PDF is rebuilt from what was stored when it was first sent, so the parent
 * receives the same document rather than a fresh one with today's date. No new
 * history entry is created — this is the same invoice going out again.
 */
export async function POST(request, { params }) {
    try {
        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json(
                { error: 'Email service is not configured on the server.' },
                { status: 500 }
            );
        }

        const { id } = await params;
        const invoice = await getInvoice(id);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (!invoice.parentEmail) {
            return NextResponse.json({ error: 'This invoice has no parent email.' }, { status: 409 });
        }

        if (!canRebuildInvoice(invoice)) {
            return NextResponse.json(
                { error: 'This invoice was sent before hours and rate were recorded, so it cannot be re-sent.' },
                { status: 409 }
            );
        }

        const invoiceInput = invoiceInputFromRecord(invoice);
        const pdfBytes = await generateInvoicePDF(invoiceInput);
        const { html, text } = buildInvoiceEmail(invoiceInput);

        // The sender identity follows current settings even though the document
        // itself is rebuilt from the snapshot — mail must come from the address
        // that is verified today.
        const settings = await getSettings();
        const businessName = settings.businessName || invoice.settingsSnapshot?.businessName || 'LittleHours';

        const emailOptions = {
            from: `${businessName} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: invoice.parentEmail,
            subject: `Invoice for ${invoice.period} - ${invoice.childName}`,
            html,
            text,
            attachments: [
                {
                    filename: storedInvoiceFileName(invoice),
                    content: Buffer.from(pdfBytes),
                },
            ],
        };

        if (settings.businessEmail) {
            emailOptions.replyTo = settings.businessEmail;
        }

        const data = await resendClient().emails.send(emailOptions);

        return NextResponse.json({ success: true, messageId: data.id });
    } catch (error) {
        console.error('[Invoice resend] Error:', error);
        return NextResponse.json(
            { error: 'Failed to re-send invoice', details: error.message },
            { status: 500 }
        );
    }
}

function resendClient() {
    return new Resend(process.env.RESEND_API_KEY);
}
