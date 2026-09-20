import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { logInvoice, getChildren, getSettings } from '@/lib/serverStore';
import { buildInvoiceEmail } from '@/lib/invoiceEmail';

export async function POST(request) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY is missing');
            return NextResponse.json(
                { error: 'Email service is not configured on the server.' },
                { status: 500 }
            );
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { childName, parentEmail, totalHours, hourlyRate, totalCost, periodLabel, invoiceDate, pdfBase64, fileName } = await request.json();

        // Validate required fields
        if (!childName || !parentEmail || !pdfBase64) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const base64Data = pdfBase64.split(',')[1]; // Remove data:application/pdf;base64, prefix
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        // The client sends the period the invoice actually covers; older
        // callers that omit it fall back to the current month.
        const monthYear = periodLabel || new Date().toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
        });

        // Get settings for branding
        const settings = await getSettings();
        const businessName = settings.businessName || 'LittleHours';
        const businessEmail = settings.businessEmail;

        // Same model as the attached PDF, so the figures always agree
        const { html, text } = buildInvoiceEmail({
            childName,
            totalHours,
            hourlyRate,
            totalCost,
            periodLabel: monthYear,
            invoiceDate,
            settings,
        });

        // Send email with Resend
        const emailOptions = {
            from: `${businessName} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: parentEmail,
            subject: `Invoice for ${monthYear} - ${childName}`,
            html,
            text,
            attachments: [
                {
                    filename: fileName,
                    content: pdfBuffer,
                },
            ],
        };

        // Add reply-to if business email is configured
        if (businessEmail) {
            emailOptions.replyTo = businessEmail;
        }

        const data = await resend.emails.send(emailOptions);

        // Log the invoice to history
        const children = await getChildren();
        const child = children.find(c => c.name === childName);

        if (child) {
            await logInvoice({
                childId: child.id,
                childName: childName,
                parentEmail: parentEmail,
                amount: parseFloat(totalCost),
                period: monthYear,
                // Captured so this invoice can be rebuilt and re-sent later
                totalHours,
                hourlyRate,
                invoiceDate,
                settings
            });
        }

        return NextResponse.json({
            success: true,
            messageId: data.id
        });

    } catch (error) {
        console.error('Error sending invoice email:', error);
        return NextResponse.json(
            {
                error: 'Failed to send invoice email',
                details: error.message
            },
            { status: 500 }
        );
    }
}
