// API endpoint to sync server data to client
import { NextResponse } from 'next/server';
import { getChildren, getAttendance } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const user = await requireUser();
        const children = await getChildren(user.id);
        const attendance = await getAttendance(user.id);
        return NextResponse.json({ children, attendance });
    } catch (error) {
        return errorResponse(error, 'Sync API', 'Failed to sync data');
    }
}
