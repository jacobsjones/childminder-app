import { NextResponse } from 'next/server';
import {
    getChild, getAttendance, getTotalHoursForChild, updateAttendance,
    logHours, deleteAttendance, deleteChild,
} from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const childId = parseInt(id);

        const child = await getChild(user.id, childId);
        if (!child) throw new NotFoundError('Child not found');

        const allAttendance = await getAttendance(user.id);
        const totalHours = await getTotalHoursForChild(user.id, childId);

        return NextResponse.json({
            child,
            attendance: allAttendance.filter(a => a.childId === childId),
            totalHours
        });
    } catch (error) {
        return errorResponse(error, 'Child Detail API GET', 'Failed to get child details');
    }
}

export async function PUT(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const childId = parseInt(id);
        const body = await request.json();
        const { action, hours, date } = body;
        const recordId = body.id ?? body.recordId;

        if (action === 'updateAttendance' && recordId) {
            await updateAttendance(user.id, { ...body, id: recordId, childId });
            return NextResponse.json({ success: true });
        }

        if (action === 'logHours' && hours !== undefined) {
            await logHours(user.id, childId, hours, date);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return errorResponse(error, 'Child Detail API PUT', 'Failed to update');
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const { deleteType, recordId } = await request.json();

        if (deleteType === 'attendance' && recordId) {
            if (!(await deleteAttendance(user.id, recordId))) throw new NotFoundError('Record not found');
            return NextResponse.json({ success: true });
        }

        if (deleteType === 'child') {
            if (!(await deleteChild(user.id, parseInt(id)))) throw new NotFoundError('Child not found');
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid delete type' }, { status: 400 });
    } catch (error) {
        return errorResponse(error, 'Child Detail API DELETE', 'Failed to delete');
    }
}
