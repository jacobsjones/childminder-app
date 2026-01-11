import { NextResponse } from 'next/server';
import { saveChild } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const childData = await request.json();

        if (!childData) {
            return NextResponse.json(
                { error: 'Missing child data' },
                { status: 400 }
            );
        }

        // Save to server-side storage
        saveChild(childData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Children API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save child', details: error.message },
            { status: 500 }
        );
    }
}
