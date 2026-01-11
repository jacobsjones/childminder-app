import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { logInvoice, getChildren, getSettings } from '@/lib/serverStore';

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
        const { childName, parentEmail, totalHours, totalCost, pdfBase64, fileName } = await request.json();

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

        // Get current month/year for email
        const currentDate = new Date();
        const monthYear = currentDate.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
        });

        // Get settings for branding
        const settings = await getSettings();
        const businessName = settings.businessName || 'LittleHours';
        const businessEmail = settings.businessEmail;

        // Create branded HTML email
        const htmlContent = `
            <div style="background-color: #1f2937; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h1 style="color: #3b82f6; margin-top: 0; margin-bottom: 10px; font-size: 28px; font-weight: 700;">${businessName}</h1>
                    <p style="color: #9ca3af; font-size: 14px; margin-top: 0; margin-bottom: 30px;">Childcare Invoice</p>

                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                        Dear Parent/Guardian,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Please find attached the invoice for <strong>${childName}</strong> for <strong>${monthYear}</strong>.
                    </p>

                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin: 30px 0;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Total Hours:</p>
                        <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">${totalHours.toFixed(2)} hours</p>

                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Total Amount Due:</p>
                        <p style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0;">£${totalCost}</p>
                    </div>

                    <div style="margin-top: 30px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                            If you have any questions regarding this invoice, please don't hesitate to contact us.
                        </p>
                        <p style="color: #374151; font-size: 15px; line-height: 1.5; margin: 0;">
                            Kind regards,<br/>
                            <strong>${businessName}</strong>
                        </p>
                    </div>
                </div>

                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
                    Powered by LittleHours
                </p>
            </div>
        `;

        // Send email with Resend
        const emailOptions = {
            from: `${businessName} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: parentEmail,
            subject: `Invoice for ${monthYear} - ${childName}`,
            html: htmlContent,
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
                period: monthYear
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
