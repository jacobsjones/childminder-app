import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const data = await getDashboardData();
        return NextResponse.json({ children: data });
    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to load dashboard data', details: error.message },
            { status: 500 }
        );
    }
}
