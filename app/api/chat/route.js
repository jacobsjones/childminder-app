import OpenAI from 'openai';
import { saveChild, getChildren, logHours, getSettings, logInvoice, getAttendance } from '@/lib/serverStore';
import { reserveUsage, USAGE_KINDS } from '@/lib/usageLimits';
import { sendInvoiceEmail } from '@/lib/invoiceMail';
import { invoiceFileName } from '@/lib/invoiceTemplate';
import { InvalidRecipientError, LimitError } from '@/lib/errors';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { buildInvoiceEmail } from '@/lib/invoiceEmail';
import { parseMonthString, filterAttendanceByMonthKey, calculateTotalHours } from '@/lib/monthHelper';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 1-20 user/assistant messages of 1-2000 characters, rebuilt without extra fields; else null. */
function cleanMessages(messages) {
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20) return null;
    const clean = [];
    for (const message of messages) {
        if (!message || typeof message !== 'object') return null;
        const { role, content } = message;
        if (role !== 'user' && role !== 'assistant') return null;
        if (typeof content !== 'string' || content.length < 1 || content.length > 2000) return null;
        clean.push({ role, content });
    }
    return clean;
}

export async function POST(request) {
    try {
        const user = await requireUser();
        const body = await request.json().catch(() => null);
        const messages = cleanMessages(body?.messages);
        if (!messages) {
            return Response.json({ error: 'Invalid messages.' }, { status: 400 });
        }

        // Counts the request before the OpenAI call; not given back on failure
        // because the cost is already incurred.
        await reserveUsage(user.id, USAGE_KINDS.assistant);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant for a childminder. Use the provided tools to manage children, log hours, and send invoices. Always refer to children by their names.'
                },
                ...messages
            ],
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'createChild',
                        description: 'Add a new child',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                rate: { type: 'number' }
                            },
                            required: ['name', 'rate']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'logHours',
                        description: 'Log hours for a child',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                hours: { type: 'number' }
                            },
                            required: ['name', 'hours']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'listChildren',
                        description: 'List all children',
                        parameters: { type: 'object', properties: {} }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'sendInvoice',
                        description: 'Send an invoice',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                month: { type: 'string', description: 'Month name like "January"' }
                            },
                            required: ['name']
                        }
                    }
                }
            ],
            tool_choice: 'auto',
            max_tokens: 500,
        });

        const choice = response.choices[0];
        let assistantMessage = choice.message;

        if (assistantMessage.tool_calls) {
            const toolResults = [];

            for (const toolCall of assistantMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let result = '';

                if (toolCall.function.name === 'createChild') {
                    await saveChild(user.id, { name: args.name, rate: args.rate, email: '' });
                    result = `Added ${args.name} with rate £${args.rate}/hr.`;
                } else if (toolCall.function.name === 'logHours') {
                    const children = await getChildren(user.id);
                    const child = children.find(c => c.name.toLowerCase().includes(args.name.toLowerCase()));
                    if (child) {
                        await logHours(user.id, child.id, args.hours);
                        result = `Logged ${args.hours} hours for ${child.name}.`;
                    } else {
                        result = `Child ${args.name} not found.`;
                    }
                } else if (toolCall.function.name === 'listChildren') {
                    const children = await getChildren(user.id);
                    result = children.length ? children.map(c => `${c.name} (£${c.rate}/hr)`).join(', ') : 'No children found.';
                } else if (toolCall.function.name === 'sendInvoice') {
                    const children = await getChildren(user.id);
                    const child = children.find(c => c.name.toLowerCase().includes(args.name.toLowerCase()));
                    if (!child || !child.email) {
                        result = `Child not found or has no email address.`;
                    } else {
                        const settings = await getSettings(user.id);
                        const { monthKey, monthName } = parseMonthString(args.month || '');
                        const allAttendance = await getAttendance(user.id);
                        const monthAttendance = filterAttendanceByMonthKey(allAttendance.filter(a => a.childId === child.id), monthKey);

                        if (monthAttendance.length === 0) {
                            result = `No attendance records for ${monthName}.`;
                        } else {
                            const totalHours = calculateTotalHours(monthAttendance);
                            const totalCost = totalHours * child.rate;
                            const invoiceDate = new Date().toISOString();
                            const invoiceInput = { child, monthName, totalHours, rate: child.rate, totalCost, invoiceDate, settings, sessions: monthAttendance };
                            const pdfBytes = await generateInvoicePDF(invoiceInput);
                            const { html, text } = buildInvoiceEmail(invoiceInput);
                            let sent = false;
                            try {
                                await sendInvoiceEmail({
                                    userId: user.id,
                                    to: child.email,
                                    childName: child.name,
                                    subject: `Invoice for ${child.name} - ${monthName}`,
                                    html,
                                    text,
                                    pdfBytes,
                                    fileName: invoiceFileName(child.name),
                                    settings,
                                });
                                sent = true;
                            } catch (sendError) {
                                if (sendError instanceof LimitError || sendError instanceof InvalidRecipientError) {
                                    result = sendError.message;
                                } else {
                                    console.error('[Chat] Invoice email failed:', sendError);
                                    result = `The invoice email could not be sent, so nothing was sent or recorded.`;
                                }
                            }
                            if (sent) {
                                result = `Invoice sent to ${child.email} for ${monthName}.`;
                                try {
                                    await logInvoice(user.id, {
                                        childId: child.id,
                                        childName: child.name,
                                        parentEmail: child.email,
                                        amount: totalCost,
                                        period: monthName,
                                        totalHours,
                                        hourlyRate: child.rate,
                                        invoiceDate,
                                        settings
                                    });
                                } catch (logError) {
                                    console.error('[Chat] Invoice sent, but saving to history failed:', logError);
                                    result += ' It could not be saved to the invoice history.';
                                }
                            }
                        }
                    }
                }

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: toolCall.function.name,
                    content: result,
                });
            }

            // Get final response from AI explaining the results
            const finalResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    ...messages,
                    assistantMessage,
                    ...toolResults
                ],
                max_tokens: 500,
            });

            return new Response(JSON.stringify({ content: finalResponse.choices[0].message.content }));
        }

        return new Response(JSON.stringify({ content: assistantMessage.content }));

    } catch (error) {
        return errorResponse(error, 'Chat');
    }
}
