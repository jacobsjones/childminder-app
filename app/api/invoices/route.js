import { NextResponse } from 'next/server';
import { getInvoices, logInvoice } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const user = await requireUser();
        return NextResponse.json(await getInvoices(user.id));
    } catch (error) {
        return errorResponse(error, 'Invoices API GET', 'Failed to get invoices');
    }
}

export async function POST(request) {
    try {
        const user = await requireUser();
        const invoiceData = await request.json();

        if (!invoiceData) {
            return NextResponse.json({ error: 'Missing invoice data' }, { status: 400 });
        }

        if (!invoiceData.childId || !invoiceData.childName || !invoiceData.amount || !invoiceData.period) {
            return NextResponse.json(
                { error: 'Missing required fields: childId, childName, amount, period' },
                { status: 400 }
            );
        }

        const record = await logInvoice(user.id, invoiceData);
        return NextResponse.json({ success: true, invoice: record });
    } catch (error) {
        return errorResponse(error, 'Invoices API POST', 'Failed to log invoice');
    }
}
