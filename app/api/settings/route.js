import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/serverStore';
import { requireUser } from '@/lib/requireUser';
import { errorResponse } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const user = await requireUser();
        return NextResponse.json(await getSettings(user.id));
    } catch (error) {
        return errorResponse(error, 'Settings API GET', 'Failed to get settings');
    }
}

export async function POST(request) {
    try {
        const user = await requireUser();
        const settingsData = await request.json();

        if (!settingsData) {
            return NextResponse.json({ error: 'Missing settings data' }, { status: 400 });
        }

        await saveSettings(user.id, settingsData);
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Settings API POST', 'Failed to save settings');
    }
}
