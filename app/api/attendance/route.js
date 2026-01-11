import { NextResponse } from 'next/server';
import { logHours } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const { childId, date, hours } = await request.json();

        if (!childId || !date || hours === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: childId, date, hours' },
                { status: 400 }
            );
        }

        // Save to server-side storage
        logHours(childId, hours, date);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Attendance API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save attendance', details: error.message },
            { status: 500 }
        );
    }
}
