import { NextResponse } from 'next/server';
import { logHours, deleteAttendance } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { childId, date, hours, action } = body;

        // Support both old format and new format with action
        if (action === 'logHours') {
            // New format from Dashboard
            const dateStr = date || new Date().toISOString().slice(0, 10);
            await logHours(childId, hours, dateStr);
            return NextResponse.json({ success: true });
        }

        // Old format (backward compatibility)
        if (!childId || hours === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: childId, hours' },
                { status: 400 }
            );
        }

        const dateStr = date || new Date().toISOString().slice(0, 10);
        await logHours(childId, hours, dateStr);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Attendance API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save attendance', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Missing required field: id' },
                { status: 400 }
            );
        }

        await deleteAttendance(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Attendance API DELETE] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete attendance', details: error.message },
            { status: 500 }
        );
    }
}
