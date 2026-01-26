import OpenAI from 'openai';
import { saveChild, getChildren, logHours, getTodayHours, getSettings, logInvoice, deleteAttendance, getAttendance } from '@/lib/serverStore';
import { generateInvoicePDF } from '@/lib/serverPdfGenerator';
import { parseMonthString, filterAttendanceByMonth, calculateTotalHours } from '@/lib/monthHelper';
import { Resend } from 'resend';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
    try {
        const { messages } = await request.json();

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
        });

        const choice = response.choices[0];
        let assistantMessage = choice.message;

        if (assistantMessage.tool_calls) {
            const toolResults = [];

            for (const toolCall of assistantMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let result = '';

                if (toolCall.function.name === 'createChild') {
                    await saveChild({ name: args.name, rate: args.rate, email: '' });
                    result = `Added ${args.name} with rate £${args.rate}/hr.`;
                } else if (toolCall.function.name === 'logHours') {
                    const children = await getChildren();
                    const child = children.find(c => c.name.toLowerCase().includes(args.name.toLowerCase()));
                    if (child) {
                        await logHours(child.id, args.hours);
                        result = `Logged ${args.hours} hours for ${child.name}.`;
                    } else {
                        result = `Child ${args.name} not found.`;
                    }
                } else if (toolCall.function.name === 'listChildren') {
                    const children = await getChildren();
                    result = children.length ? children.map(c => `${c.name} (£${c.rate}/hr)`).join(', ') : 'No children found.';
                } else if (toolCall.function.name === 'sendInvoice') {
                    const children = await getChildren();
                    const child = children.find(c => c.name.toLowerCase().includes(args.name.toLowerCase()));
                    if (!child || !child.email) {
                        result = `Child not found or has no email address.`;
                    } else {
                        const settings = await getSettings();
                        const { startDate, endDate, monthName } = parseMonthString(args.month || '');
                        const allAttendance = await getAttendance();
                        const monthAttendance = filterAttendanceByMonth(allAttendance.filter(a => a.childId === child.id), startDate, endDate);

                        if (monthAttendance.length === 0) {
                            result = `No attendance records for ${monthName}.`;
                        } else {
                            const totalHours = calculateTotalHours(monthAttendance);
                            const totalCost = totalHours * child.rate;
                            const pdfBytes = await generateInvoicePDF({ child, monthName, totalHours, rate: child.rate, totalCost, settings, sessions: monthAttendance });
                            const resend = new Resend(process.env.RESEND_API_KEY);
                            await resend.emails.send({
                                from: `${settings.businessName || 'LittleHours'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                                to: child.email,
                                subject: `Invoice for ${child.name} - ${monthName}`,
                                html: `<p>Invoice for ${monthName} is attached.</p>`,
                                attachments: [{ filename: `Invoice_${child.name}_${monthName}.pdf`, content: Buffer.from(pdfBytes) }]
                            });
                            await logInvoice({ childId: child.id, childName: child.name, parentEmail: child.email, amount: totalCost, period: monthName });
                            result = `Invoice sent to ${child.email} for ${monthName}.`;
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
            });

            return new Response(JSON.stringify({ content: finalResponse.choices[0].message.content }));
        }

        return new Response(JSON.stringify({ content: assistantMessage.content }));

    } catch (error) {
        console.error('Chat error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
