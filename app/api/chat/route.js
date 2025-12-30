import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getChildren, saveChild, checkIn, checkOut, deleteAttendance, getAttendance } from '@/lib/store';

// Force Node.js runtime (not Edge) for database operations
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
    console.log("=== API /chat called. Checking API Key... ===");
    console.log('[Chat API] Request received');

    try {
        // 1. Check for OpenAI API Key
        if (!process.env.OPENAI_API_KEY) {
            console.error('ERROR: No OpenAI API Key found!');
            console.error('[Chat API] Missing OpenAI API Key');
            return NextResponse.json(
                { error: 'Missing OpenAI API Key - Please add OPENAI_API_KEY to your .env.local file' },
                { status: 401 }
            );
        }

        console.log('✓ OpenAI API Key found');
        console.log('[Chat API] OpenAI API Key found');

        // 2. Parse request body
        let message;
        try {
            const body = await request.json();
            message = body.message;
            console.log('[Chat API] Received message:', message);
        } catch (parseError) {
            console.error('[Chat API] Failed to parse request body:', parseError);
            return NextResponse.json(
                { error: 'Invalid request body', details: parseError.message },
                { status: 400 }
            );
        }

        // 3. Validate message
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            console.error('[Chat API] Message is required');
            return NextResponse.json(
                { error: 'Message is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        console.log('[Chat API] Defining tools...');

        // 4. Define tools for the AI with proper Zod schemas
        const tools = {
            addChild: {
                description: 'Add a new child to the childminding system. Use this when the user wants to add or register a new child. If no rate is mentioned, use 0.',
                parameters: z.object({
                    name: z.string().describe('The full name of the child'),
                }),
                execute: async ({ name }) => {
                    console.log(`[Tool: addChild] Executing with name="${name}"`);
                    try {
                        const newChild = {
                            name: name.trim(),
                            rate: 0,
                            email: '',
                        };
                        saveChild(newChild);
                        const message = `Successfully added ${name} to your childminding list with a rate of £0/hour.`;
                        console.log(`[Tool: addChild] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: addChild] Error:`, error);
                        return `Failed to add child: ${error.message}`;
                    }
                },
            },

            checkInChild: {
                description: 'Check in a child for the day. Use this when the user wants to mark a child as arrived or present.',
                parameters: z.object({
                    name: z.string().describe('The name of the child to check in'),
                }),
                execute: async ({ name }) => {
                    console.log(`[Tool: checkInChild] Executing with name="${name}"`);
                    try {
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${name}. Please check the name and try again.`;
                            console.log(`[Tool: checkInChild] Child not found:`, message);
                            return message;
                        }

                        // Check if already checked in today
                        const attendance = getAttendance();
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const alreadyCheckedIn = attendance.find(
                            a => a.childId === child.id &&
                                a.startTime.startsWith(todayStr) &&
                                !a.endTime
                        );

                        if (alreadyCheckedIn) {
                            const message = `${child.name} is already checked in today.`;
                            console.log(`[Tool: checkInChild] Already checked in:`, message);
                            return message;
                        }

                        checkIn(child.id);
                        const message = `Successfully checked in ${child.name} at ${new Date().toLocaleTimeString()}.`;
                        console.log(`[Tool: checkInChild] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: checkInChild] Error:`, error);
                        return `Failed to check in: ${error.message}`;
                    }
                },
            },

            checkOutChild: {
                description: 'Check out a child for the day. Use this when the user wants to mark a child as leaving or departed.',
                parameters: z.object({
                    name: z.string().describe('The name of the child to check out'),
                }),
                execute: async ({ name }) => {
                    console.log(`[Tool: checkOutChild] Executing with name="${name}"`);
                    try {
                        const children = getChildren();
                        const child = children.find(c =>
                            c.name.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (!child) {
                            const message = `I couldn't find a child named ${name}. Please check the name and try again.`;
                            console.log(`[Tool: checkOutChild] Child not found:`, message);
                            return message;
                        }

                        // Find active check-in
                        const attendance = getAttendance();
                        const activeCheckIn = attendance.find(
                            a => a.childId === child.id && !a.endTime
                        );

                        if (!activeCheckIn) {
                            const message = `${child.name} is not currently checked in.`;
                            console.log(`[Tool: checkOutChild] Not checked in:`, message);
                            return message;
                        }

                        checkOut(child.id);
                        const message = `Successfully checked out ${child.name} at ${new Date().toLocaleTimeString()}.`;
                        console.log(`[Tool: checkOutChild] Success:`, message);
                        return message;
                    } catch (error) {
                        console.error(`[Tool: checkOutChild] Error:`, error);
                        return `Failed to check out: ${error.message}`;
                    }
                },
            },

            markAbsent: {
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
            },

            listChildren: {
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
            },
        };

        console.log('[Chat API] Tools defined successfully, calling OpenAI...');

        // 5. Generate AI response with tools
        console.log('=== Calling OpenAI generateText... ===');
        let result;
        try {
            console.log('CRITICAL: About to call generateText with tools');
            result = await generateText({
                model: openai('gpt-4o-mini'),
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful voice assistant for a childminder's business management app.
                        You help manage children, track attendance, and handle daily operations.
                        When a user gives you a command, use the available tools to execute it.
                        Be friendly, concise, and confirm actions clearly.
                        If you need more information, ask for it politely.
                        Always refer to children by their first names.`
                    },
                    {
                        role: 'user',
                        content: message,
                    },
                ],
                tools,
                maxToolRoundtrips: 3,
            });

            console.log('[Chat API] OpenAI response received');
            console.log('[Chat API] Result text:', result.text);
            console.log('[Chat API] Tool calls:', result.toolCalls?.length ?? 0);

        } catch (aiError) {
            console.error('CRITICAL AI ERROR:', aiError);
            console.error('[Chat API] OpenAI generateText error:', aiError);
            console.error('[Chat API] Error details:', {
                message: aiError.message,
                cause: aiError.cause,
                stack: aiError.stack,
                name: aiError.name,
                constructor: aiError.constructor.name,
            });

            return NextResponse.json(
                {
                    error: 'AI Error',
                    details: aiError.message,
                    aiErrorType: aiError.constructor.name,
                },
                { status: 500 }
            );
        }

        // 6. Check if any tool was executed
        const requiresReload = result.toolCalls && result.toolCalls.length > 0;
        const responseMessage = result.text;

        console.log('[Chat API] Sending response, requiresReload:', requiresReload);

        return NextResponse.json({
            response: responseMessage,
            requiresReload,
        });

    } catch (error) {
        // 7. Catch-all error handler
        console.error('[Chat API] Unexpected error:', error);
        console.error('[Chat API] Error stack:', error.stack);
        console.error('[Chat API] Error details:', {
            message: error.message,
            name: error.name,
            cause: error.cause,
        });

        return NextResponse.json(
            {
                error: 'Failed to process request',
                details: error.message,
                errorType: error.constructor.name,
            },
            { status: 500 }
        );
    }
}
