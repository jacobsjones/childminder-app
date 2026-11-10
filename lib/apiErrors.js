import { NextResponse } from 'next/server';
import { AuthError, ConfigError, InvalidRecipientError, LimitError, NotFoundError } from '@/lib/errors';

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
    if (error instanceof LimitError) {
        return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof InvalidRecipientError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(`[${context}] Error:`, error);
    if (error instanceof ConfigError) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
}
