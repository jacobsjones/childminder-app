import { NextResponse } from 'next/server';
import { getChild, getInvoice, getSettings } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { buildInvoiceEmail } from '@/lib/invoiceEmail';
import { sendInvoiceEmail } from '@/lib/invoiceMail';
import { canRebuildInvoice, invoiceInputFromRecord, storedInvoiceFileName } from '@/lib/storedInvoice';
import { requireUser } from '@/lib/requireUser';
import { errorResponse, parseId } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

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
        const user = await requireUser();
        const { id } = await params;
        const invoice = await getInvoice(user.id, parseId(id));
        if (!invoice) throw new NotFoundError('Invoice not found');

        // The recipient is the child's current email. The email stored on the
        // invoice is history only and is never used as a destination.
        const child = invoice.childId ? await getChild(user.id, invoice.childId) : null;
        if (!child) {
            return NextResponse.json({ error: 'This child no longer exists, so the invoice cannot be re-sent.' }, { status: 409 });
        }
        if (!child.email) {
            return NextResponse.json({ error: `Add a parent email for ${child.name} first.` }, { status: 409 });
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
        const settings = await getSettings(user.id);
        const messageId = await sendInvoiceEmail({
            userId: user.id,
            to: child.email,
            childName: child.name,
            subject: `Invoice for ${invoice.period} - ${invoice.childName}`,
            html,
            text,
            pdfBytes,
            fileName: storedInvoiceFileName(invoice),
            settings: {
                ...settings,
                businessName: settings.businessName || invoice.settingsSnapshot?.businessName,
            },
        });

        return NextResponse.json({ success: true, messageId });
    } catch (error) {
        return errorResponse(error, 'Invoice resend', 'Failed to re-send invoice');
    }
}
