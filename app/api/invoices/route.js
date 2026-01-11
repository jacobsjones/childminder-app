import { NextResponse } from 'next/server';
import { getInvoices, logInvoice } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const invoices = await getInvoices();
        return NextResponse.json(invoices);
    } catch (error) {
        console.error('[Invoices API GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get invoices', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const invoiceData = await request.json();

        if (!invoiceData) {
            return NextResponse.json(
                { error: 'Missing invoice data' },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!invoiceData.childId || !invoiceData.childName || !invoiceData.amount || !invoiceData.period) {
            return NextResponse.json(
                { error: 'Missing required fields: childId, childName, amount, period' },
                { status: 400 }
            );
        }

        // Save to server-side storage
        const record = await logInvoice(invoiceData);

        return NextResponse.json({ success: true, invoice: record });
    } catch (error) {
        console.error('[Invoices API POST] Error:', error);
        return NextResponse.json(
            { error: 'Failed to log invoice', details: error.message },
            { status: 500 }
        );
    }
}
