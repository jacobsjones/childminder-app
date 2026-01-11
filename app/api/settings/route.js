import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/serverStore';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const settings = getSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('[Settings API GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get settings', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const settingsData = await request.json();

        if (!settingsData) {
            return NextResponse.json(
                { error: 'Missing settings data' },
                { status: 400 }
            );
        }

        // Save to server-side storage
        saveSettings(settingsData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Settings API POST] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save settings', details: error.message },
            { status: 500 }
        );
    }
}
