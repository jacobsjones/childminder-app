import { NextResponse } from 'next/server';
import { getInvoice, updateInvoiceStatus } from '@/lib/serverStore';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['Sent', 'Paid'];

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const invoice = await getInvoice(id);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('[Invoice GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get invoice', details: error.message },
            { status: 500 }
        );
    }
}

/** Mark an invoice paid or back to unpaid. */
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const { status } = await request.json();

        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const invoice = await updateInvoiceStatus(id, status);

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, invoice });
    } catch (error) {
        console.error('[Invoice PATCH] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update invoice', details: error.message },
            { status: 500 }
        );
    }
}
