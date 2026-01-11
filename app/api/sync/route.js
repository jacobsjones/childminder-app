// API endpoint to sync server data to client
import { NextResponse } from 'next/server';
import { getChildren, getAttendance } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const children = await getChildren();
        const attendance = await getAttendance();

        return NextResponse.json({
            children,
            attendance,
        });
    } catch (error) {
        console.error('[Sync API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to sync data', details: error.message },
            { status: 500 }
        );
    }
}
