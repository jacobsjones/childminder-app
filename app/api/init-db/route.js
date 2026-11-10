import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { migrateDatabase } from '@/lib/migrate';

export const runtime = 'nodejs';

function secretMatches(given, expected) {
    const a = Buffer.from(given || '');
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/** Admin-only: run the schema migration. Send the secret in x-admin-secret. */
export async function POST(request) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || !secretMatches(request.headers.get('x-admin-secret'), expected)) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
    }

    try {
        await migrateDatabase();
        return NextResponse.json({ success: true, message: 'Database migrated' });
    } catch (error) {
        console.error('Database migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
