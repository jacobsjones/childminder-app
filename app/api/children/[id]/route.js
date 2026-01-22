import { NextResponse } from 'next/server';
import { getChild, getAttendance, getTotalHoursForChild, updateAttendance, logHours } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const childId = parseInt(id);

        const child = await getChild(childId);
        if (!child) {
            return NextResponse.json({ error: 'Child not found' }, { status: 404 });
        }

        const allAttendance = await getAttendance();
        const childAttendance = allAttendance.filter(a => a.childId === childId);
        const totalHours = await getTotalHoursForChild(childId);

        return NextResponse.json({
            child,
            attendance: childAttendance,
            totalHours
        });
    } catch (error) {
        console.error('[Child Detail API GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get child details', details: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const childId = parseInt(id);
        const body = await request.json();
        const { action, recordId, hours, date } = body;

        if (action === 'updateAttendance' && recordId) {
            await updateAttendance(body);
            return NextResponse.json({ success: true });
        }

        if (action === 'logHours' && hours !== undefined) {
            await logHours(childId, hours, date);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('[Child Detail API PUT] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const { deleteType, recordId } = await request.json();

        if (deleteType === 'attendance' && recordId) {
            const { deleteAttendance } = await import('@/lib/serverStore');
            await deleteAttendance(recordId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid delete type' }, { status: 400 });
    } catch (error) {
        console.error('[Child Detail API DELETE] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete', details: error.message },
            { status: 500 }
        );
    }
}
