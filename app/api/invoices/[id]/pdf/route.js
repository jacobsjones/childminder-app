import { NextResponse } from 'next/server';
import { getInvoice } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { canRebuildInvoice, invoiceInputFromRecord, storedInvoiceFileName } from '@/lib/storedInvoice';
import { requireUser } from '@/lib/requireUser';
import { errorResponse, parseId } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

/** Rebuild a past invoice as a PDF and return it for download. */
export async function GET(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const invoice = await getInvoice(user.id, parseId(id));
        if (!invoice) throw new NotFoundError('Invoice not found');

        if (!canRebuildInvoice(invoice)) {
            return NextResponse.json(
                { error: 'This invoice was sent before hours and rate were recorded, so it cannot be rebuilt.' },
                { status: 409 }
            );
        }

        const pdfBytes = await generateInvoicePDF(invoiceInputFromRecord(invoice));

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${storedInvoiceFileName(invoice)}"`,
            },
        });
    } catch (error) {
        return errorResponse(error, 'Invoice PDF', 'Failed to rebuild invoice');
    }
}
