import { NextResponse } from 'next/server';
import { getChildren, saveChild } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const children = await getChildren();
        return NextResponse.json(children);
    } catch (error) {
        console.error('[Children API GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get children', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const childData = await request.json();

        if (!childData || !childData.name) {
            return NextResponse.json(
                { error: 'Missing child data' },
                { status: 400 }
            );
        }

        // Save to server-side storage
        const result = await saveChild(childData);

        // Return the created child with its ID
        return NextResponse.json(result.child || { success: true });
    } catch (error) {
        console.error('[Children API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save child', details: error.message },
            { status: 500 }
        );
    }
}
