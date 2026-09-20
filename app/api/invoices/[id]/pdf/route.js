import { NextResponse } from 'next/server';
import { getInvoice } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { canRebuildInvoice, invoiceInputFromRecord, storedInvoiceFileName } from '@/lib/storedInvoice';

export const runtime = 'nodejs';

/** Rebuild a past invoice as a PDF and return it for download. */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const invoice = await getInvoice(id);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

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
        console.error('[Invoice PDF] Error:', error);
        return NextResponse.json(
            { error: 'Failed to rebuild invoice', details: error.message },
            { status: 500 }
        );
    }
}
