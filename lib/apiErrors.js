import { NextResponse } from 'next/server';
import { AuthError, NotFoundError } from '@/lib/errors';

/** A positive whole number from a URL segment or request body, else NotFoundError (404). */
export function parseId(value) {
    const text = String(value ?? '').trim();
    if (!/^[1-9]\d{0,9}$/.test(text) || Number(text) > 2147483647) {
        throw new NotFoundError();
    }
    return Number(text);
}

/** Turn an error thrown in an API route into the right JSON response. */
export function errorResponse(error, context, message = 'Something went wrong') {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    if (error instanceof NotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`[${context}] Error:`, error);
    return NextResponse.json({ error: message, details: error.message }, { status: 500 });
}
