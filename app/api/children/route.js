import { NextResponse } from 'next/server';
import { getChildren, saveChild } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const user = await requireUser();
        return NextResponse.json(await getChildren(user.id));
    } catch (error) {
        return errorResponse(error, 'Children API GET', 'Failed to get children');
    }
}

export async function POST(request) {
    try {
        const user = await requireUser();
        const childData = await request.json();

        if (!childData || !childData.name) {
            return NextResponse.json({ error: 'Missing child data' }, { status: 400 });
        }

        const result = await saveChild(user.id, childData);
        return NextResponse.json(result.child);
    } catch (error) {
        return errorResponse(error, 'Children API POST', 'Failed to save child');
    }
}
