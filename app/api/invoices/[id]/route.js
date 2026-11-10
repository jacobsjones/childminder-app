import { NextResponse } from 'next/server';
import { getInvoice, updateInvoiceStatus, deleteInvoice } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['Sent', 'Paid'];

export async function GET(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const invoice = await getInvoice(user.id, id);
        if (!invoice) throw new NotFoundError('Invoice not found');
        return NextResponse.json(invoice);
    } catch (error) {
        return errorResponse(error, 'Invoice GET', 'Failed to get invoice');
    }
}

/** Mark an invoice paid or back to unpaid. */
export async function PATCH(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const { status } = await request.json();

        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const invoice = await updateInvoiceStatus(user.id, id, status);
        if (!invoice) throw new NotFoundError('Invoice not found');
        return NextResponse.json({ success: true, invoice });
    } catch (error) {
        return errorResponse(error, 'Invoice PATCH', 'Failed to update invoice');
    }
}

/** Remove an invoice from the history. */
export async function DELETE(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        if (!(await deleteInvoice(user.id, id))) throw new NotFoundError('Invoice not found');
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Invoice DELETE', 'Failed to delete invoice');
    }
}
