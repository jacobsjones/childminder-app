import { NextResponse } from 'next/server';
import { logHours, deleteAttendance } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const user = await requireUser();
        // Accepts both { action: 'logHours', ... } and the older shape without action
        const { childId, date, hours } = await request.json();

        if (!childId || hours === undefined) {
            return NextResponse.json({ error: 'Missing required fields: childId, hours' }, { status: 400 });
        }

        await logHours(user.id, childId, hours, date || new Date().toISOString().slice(0, 10));
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Attendance API', 'Failed to save attendance');
    }
}

export async function DELETE(request) {
    try {
        const user = await requireUser();
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
        }

        if (!(await deleteAttendance(user.id, id))) throw new NotFoundError('Record not found');
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Attendance API DELETE', 'Failed to delete attendance');
    }
}
