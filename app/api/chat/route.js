import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { getChildren, saveChild, deleteAttendance, getAttendance, logHours, getTodayHours, getSettings, logInvoice } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { parseMonthString, filterAttendanceByMonth, calculateTotalHours } from '@/lib/monthHelper';
import { Resend } from 'resend';

// Force Node.js runtime (not Edge) for database operations
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
    console.log("=== API /chat called ===");
    console.log('[Chat API] Request received');

    try {
        // 1. Check for OpenAI API Key
        if (!process.env.OPENAI_API_KEY) {
            console.error('[Chat API] Missing OpenAI API Key');
            return new Response(
                JSON.stringify({ error: 'Missing OpenAI API Key - Please add OPENAI_API_KEY to your .env.local file' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Chat API] OpenAI API Key found');

        // 2. Parse request body
        let messages;
        try {
            const body = await request.json();
            messages = body.messages;
            console.log('[Chat API] Received messages:', messages?.length || 0);
        } catch (parseError) {
            console.error('[Chat API] Failed to parse request body:', parseError);
            return new Response(
                JSON.stringify({ error: 'Invalid request body', details: parseError.message }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. Validate messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error('[Chat API] Messages array is required');
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Chat API] Defining tools...');

        // 4. Define tools for the AI with proper Zod schemas
        const tools = {
            createChild: tool({
                description: 'Add a new child to the childminding system. Use this when the user wants to add or register a new child.',
                parameters: z.object({
                    name: z.string().describe('The full name of the child'),
                    rate: z.coerce.number().describe('The hourly rate in pounds. Use 0 if not specified.'),
                }),
                execute: async ({ name, rate }) => {
                    console.log(`[Tool: createChild] ===== START =====`);
                    console.log(`[Tool: createChild] Raw arguments:`, { name, rate });
                    console.log(`[Tool: createChild] Type of name:`, typeof name);
                    console.log(`[Tool: createChild] Type of rate:`, typeof rate);

                    try {
                        const trimmedName = name.trim();
                        const numericRate = Number(rate) || 0;

                        console.log(`[Tool: createChild] Processed values:`, {
                            trimmedName,
                            numericRate,
                            numericRateType: typeof numericRate
                        });

                        const newChild = {
                            name: trimmedName,
                            rate: numericRate,
                            email: '',
                        };

                        console.log(`[Tool: createChild] Calling saveChild with:`, newChild);
                        saveChild(newChild);
                        console.log(`[Tool: createChild] saveChild completed successfully`);

                        const message = `Successfully added ${trimmedName} to your childminding list with a rate of £${numericRate}/hour.`;
                        console.log(`[Tool: createChild] Success:`, message);
                        console.log(`[Tool: createChild] ===== END SUCCESS =====`);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: createChild] ===== ERROR =====`);
                        console.error(`[Tool: createChild] Error object:`, error);
                        console.error(`[Tool: createChild] Error message:`, error.message);
                        console.error(`[Tool: createChild] Error stack:`, error.stack);
                        console.error(`[Tool: createChild] ===== END ERROR =====`);
                        return `Failed to add child: ${error.message}`;
                    }
                },
            }),

            logChildHours: tool({
                description: 'Log hours for a child. Use this when the user wants to record how many hours a child attended today.',
                parameters: z.object({
                    name: z.string().describe('The name of the child'),
                    hours: z.number().describe('The number of hours to log (can be decimal like 7.5)'),
                }),
                execute: async ({ name, hours }) => {
                    console.log(`[Tool: logChildHours] Executing with name="${name}", hours=${hours}`);
                    try {
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${name}. Please check the name and try again.`;
                            console.log(`[Tool: logChildHours] Child not found:`, message);
                            return message;
                        }

                        logHours(child.id, hours);
                        const message = `Successfully logged ${hours} hours for ${child.name} today.`;
                        console.log(`[Tool: logChildHours] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: logChildHours] Error:`, error);
                        return `Failed to log hours: ${error.message}`;
                    }
                },
            }),

            getTodayChildHours: tool({
                description: 'Get the hours logged for a child today. Use this when the user asks how many hours a child has today.',
                parameters: z.object({
                    name: z.string().describe('The name of the child'),
                }),
                execute: async ({ name }) => {
                    console.log(`[Tool: getTodayChildHours] Executing with name="${name}"`);
                    try {
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${name}. Please check the name and try again.`;
                            console.log(`[Tool: getTodayChildHours] Child not found:`, message);
                            return message;
                        }

                        const hours = getTodayHours(child.id);
                        if (hours === null) {
                            const message = `No hours logged for ${child.name} today.`;
                            console.log(`[Tool: getTodayChildHours] No hours:`, message);
                            return message;
                        }

                        const message = `${child.name} has ${hours} hours logged today.`;
                        console.log(`[Tool: getTodayChildHours] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: getTodayChildHours] Error:`, error);
                        return `Failed to get hours: ${error.message}`;
                    }
                },
            }),

            markAbsent: tool({
                description: 'Mark a child as absent for today. Use this when a scheduled child will not be attending.',
                parameters: z.object({
                    name: z.string().describe('The name of the child to mark absent'),
                }),
                execute: async ({ name }) => {
                    console.log(`[Tool: markAbsent] Executing with name="${name}"`);
                    try {
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${name}. Please check the name and try again.`;
                            console.log(`[Tool: markAbsent] Child not found:`, message);
                            return message;
                        }

                        // Find today's scheduled attendance
                        const attendance = getAttendance();
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const todayRecord = attendance.find(
                            a => a.childId === child.id &&
                                a.startTime.startsWith(todayStr) &&
                                a.isAuto
                        );

                        if (!todayRecord) {
                            const message = `${child.name} doesn't have a scheduled session for today.`;
                            console.log(`[Tool: markAbsent] No scheduled session:`, message);
                            return message;
                        }

                        deleteAttendance(todayRecord.id);
                        const message = `Marked ${child.name} as absent for today.`;
                        console.log(`[Tool: markAbsent] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: markAbsent] Error:`, error);
                        return `Failed to mark absent: ${error.message}`;
                    }
                },
            }),

            listChildren: tool({
                description: 'List all children currently registered in the system.',
                parameters: z.object({}),
                execute: async () => {
                    console.log(`[Tool: listChildren] Executing`);
                    try {
                        const children = getChildren();

                        if (children.length === 0) {
                            const message = 'You don\'t have any children registered yet.';
                            console.log(`[Tool: listChildren] No children:`, message);
                            return message;
                        }

                        const childList = children.map(c => `${c.name} (£${c.rate}/hour)`).join(', ');
                        const message = `You have ${children.length} child${children.length > 1 ? 'ren' : ''} registered: ${childList}`;
                        console.log(`[Tool: listChildren] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: listChildren] Error:`, error);
                        return `Failed to list children: ${error.message}`;
                    }
                },
            }),

            sendInvoice: tool({
                description: 'Generate and email a PDF invoice for a child for a specific month. Use this when the user wants to send an invoice.',
                parameters: z.object({
                    childName: z.string().describe('Name of the child'),
                    month: z.string().optional().describe('The month to invoice (e.g., "January", "January 2026"). Defaults to current month if not provided.'),
                }),
                execute: async ({ childName, month }) => {
                    console.log(`[Tool: sendInvoice] ===== START =====`);
                    console.log(`[Tool: sendInvoice] Arguments:`, { childName, month });

                    try {
                        // 1. Find the child
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(childName.toLowerCase()) ||
                            childName.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${childName}. Please check the name and try again.`;
                            console.log(`[Tool: sendInvoice] Child not found:`, message);
                            return message;
                        }

                        // 2. Check if child has email
                        if (!child.email) {
                            const message = `I can't send an invoice because ${child.name} has no email address saved. Please add an email address in the child's profile first.`;
                            console.log(`[Tool: sendInvoice] No email:`, message);
                            return message;
                        }

                        // 3. Get settings for bank details
                        const settings = getSettings();
                        if (!settings.bankName) {
                            const message = `Please configure your business details in Settings first before sending invoices.`;
                            console.log(`[Tool: sendInvoice] No settings:`, message);
                            return message;
                        }

                        // 4. Parse month and get date range
                        const { startDate, endDate, monthName } = parseMonthString(month || '');
                        console.log(`[Tool: sendInvoice] Month parsed:`, { monthName, startDate, endDate });

                        // 5. Get attendance records for the month
                        const allAttendance = getAttendance();
                        const childAttendance = allAttendance.filter(a => a.childId === child.id);
                        const monthAttendance = filterAttendanceByMonth(childAttendance, startDate, endDate);

                        console.log(`[Tool: sendInvoice] Found ${monthAttendance.length} records for the month`);

                        if (monthAttendance.length === 0) {
                            const message = `${child.name} has no attendance records for ${monthName}. Cannot generate invoice.`;
                            console.log(`[Tool: sendInvoice] No records:`, message);
                            return message;
                        }

                        // 6. Calculate totals
                        const totalHours = calculateTotalHours(monthAttendance);
                        const totalCost = totalHours * child.rate;

                        console.log(`[Tool: sendInvoice] Totals:`, { totalHours, totalCost });

                        // 7. Generate PDF
                        const pdfBytes = await generateInvoicePDF({
                            child,
                            monthName,
                            totalHours,
                            rate: child.rate,
                            totalCost,
                            settings,
                            sessions: monthAttendance
                        });

                        console.log(`[Tool: sendInvoice] PDF generated, size:`, pdfBytes.length, 'bytes');

                        // 8. Send email via Resend
                        if (!process.env.RESEND_API_KEY) {
                            const message = `Email service is not configured. Please add RESEND_API_KEY to your environment variables.`;
                            console.error(`[Tool: sendInvoice] Missing Resend API key`);
                            return message;
                        }

                        const resend = new Resend(process.env.RESEND_API_KEY);

                        // Get branding details
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
                                        Please find attached the invoice for <strong>${child.name}</strong> for <strong>${monthName}</strong>.
                                    </p>

                                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin: 30px 0;">
                                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Total Hours:</p>
                                        <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">${totalHours.toFixed(2)} hours</p>

                                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Hourly Rate:</p>
                                        <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">£${child.rate.toFixed(2)}/hour</p>

                                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Total Amount Due:</p>
                                        <p style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0;">£${totalCost.toFixed(2)}</p>
                                    </div>

                                    <div style="margin-top: 30px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                            Payment details are included in the attached invoice. If you have any questions, please don't hesitate to contact us.
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

                        const emailOptions = {
                            from: `${businessName} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                            to: child.email,
                            subject: `Invoice for ${child.name} - ${monthName}`,
                            html: htmlContent,
                            attachments: [{
                                filename: `Invoice_${child.name.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`,
                                content: Buffer.from(pdfBytes)
                            }]
                        };

                        // Add reply-to if business email is configured
                        if (businessEmail) {
                            emailOptions.replyTo = businessEmail;
                        }

                        const emailResult = await resend.emails.send(emailOptions);

                        console.log(`[Tool: sendInvoice] Email sent:`, emailResult);

                        // 9. Log the invoice
                        logInvoice({
                            childId: child.id,
                            childName: child.name,
                            parentEmail: child.email,
                            amount: totalCost,
                            period: monthName
                        });

                        console.log(`[Tool: sendInvoice] Invoice logged to history`);

                        const message = `Invoice sent to ${child.email} for ${monthName}! Total: £${totalCost.toFixed(2)} (${totalHours.toFixed(2)} hours at £${child.rate}/hour)`;
                        console.log(`[Tool: sendInvoice] Success:`, message);
                        console.log(`[Tool: sendInvoice] ===== END SUCCESS =====`);
                        return message;

                    } catch (error) {
                        console.error(`[Tool: sendInvoice] ===== ERROR =====`);
                        console.error(`[Tool: sendInvoice] Error:`, error);
                        console.error(`[Tool: sendInvoice] Stack:`, error.stack);
                        console.error(`[Tool: sendInvoice] ===== END ERROR =====`);
                        return `Failed to send invoice: ${error.message}`;
                    }
                },
            }),
        };

        console.log('[Chat API] Tools defined successfully, calling OpenAI...');

        // 4. Generate streaming AI response with tools
        console.log('[Chat API] Calling OpenAI streamText...');

        const result = streamText({
            model: openai('gpt-4o-mini'),
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant for a childminder's business management app.
                    You help manage children, log their daily hours, and generate invoices.

                    The app uses a daily hours logging system. Users log the total hours a child attended at the end of the day.

                    When a user gives you a command, use the available tools to execute it.
                    Be friendly, concise, and confirm actions clearly.
                    If you need more information, ask for it politely.
                    Always refer to children by their first names.

                    Common commands:
                    - "Add a new child named [name]" - use createChild
                    - "Log [X] hours for [name]" - use logChildHours
                    - "How many hours does [name] have today?" - use getTodayChildHours
                    - "Mark [name] as absent" - use markAbsent
                    - "List all children" - use listChildren
                    - "Send invoice for [name]" or "Invoice [name] for [month]" - use sendInvoice`
                },
                ...messages,
            ],
            tools,
            maxSteps: 3,
        });

        console.log('[Chat API] Returning streaming response');
        return result.toDataStreamResponse();

    } catch (error) {
        // Catch-all error handler
        console.error('[Chat API] Unexpected error:', error);
        console.error('[Chat API] Error stack:', error.stack);
        console.error('[Chat API] Error details:', {
            message: error.message,
            name: error.name,
            cause: error.cause,
        });

        return new Response(
            JSON.stringify({
                error: 'Failed to process request',
                details: error.message,
                errorType: error.constructor.name,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
