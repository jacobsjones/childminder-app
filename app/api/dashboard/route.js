import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const user = await requireUser();
        return NextResponse.json({ children: await getDashboardData(user.id) });
    } catch (error) {
        return errorResponse(error, 'Dashboard API', 'Failed to load dashboard data');
    }
}
