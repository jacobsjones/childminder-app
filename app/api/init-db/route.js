import { initDatabase } from '@/lib/serverStore';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await initDatabase();
        return NextResponse.json({ success: true, message: 'Database initialized successfully' });
    } catch (error) {
        console.error('Database init error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
