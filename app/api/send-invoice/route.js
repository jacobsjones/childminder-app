import { NextResponse } from 'next/server';
import { getChild, getSettings, logInvoice } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { buildInvoiceEmail } from '@/lib/invoiceEmail';
import { invoiceFileName } from '@/lib/invoiceTemplate';
import { sendInvoiceEmail } from '@/lib/invoiceMail';
import { requireUser } from '@/lib/requireUser';
import { errorResponse, parseId } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

const MAX_HOURS = 744; // hours in a 31-day month

function badRequest(message) {
    return NextResponse.json({ error: message }, { status: 400 });
}

const isAmount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Email an invoice to a child's parent. The client says which child and what
 * to bill; the recipient, PDF and email body are all built here from the
 * stored child, so this cannot be used to send arbitrary mail.
 */
export async function POST(request) {
    try {
        const user = await requireUser();
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return badRequest('Invalid request.');

        const { totalHours, hourlyRate, periodLabel, invoiceDate } = body;
        if (!isAmount(totalHours) || totalHours > MAX_HOURS) return badRequest('Invalid hours.');
        if (!isAmount(hourlyRate)) return badRequest('Invalid hourly rate.');
        if (typeof periodLabel !== 'string' || !periodLabel.trim() || periodLabel.length > 40) {
            return badRequest('Invalid period.');
        }
        if (typeof invoiceDate !== 'string' || Number.isNaN(new Date(invoiceDate).getTime())) {
            return badRequest('Invalid invoice date.');
        }

        const childId = parseId(body.childId);
        const child = await getChild(user.id, childId);
        if (!child) throw new NotFoundError('Child not found');
        if (!child.email) {
            return NextResponse.json({ error: `Add a parent email for ${child.name} first.` }, { status: 409 });
        }

        const settings = await getSettings(user.id);
        const totalCost = totalHours * hourlyRate;
        const invoiceInput = { childName: child.name, totalHours, hourlyRate, totalCost, periodLabel, invoiceDate, settings };

        const pdfBytes = await generateInvoicePDF(invoiceInput);
        const { html, text } = buildInvoiceEmail(invoiceInput);

        const messageId = await sendInvoiceEmail({
            userId: user.id,
            to: child.email,
            subject: `Invoice for ${periodLabel} - ${child.name}`,
            html,
            text,
            pdfBytes,
            fileName: invoiceFileName(child.name),
            settings,
        });

        await logInvoice(user.id, {
            childId: child.id,
            childName: child.name,
            parentEmail: child.email,
            amount: totalCost,
            period: periodLabel,
            // Captured so this invoice can be rebuilt and re-sent later
            totalHours,
            hourlyRate,
            invoiceDate,
            settings,
        });

        return NextResponse.json({ success: true, messageId });
    } catch (error) {
        return errorResponse(error, 'Send invoice', 'Failed to send invoice email');
    }
}
