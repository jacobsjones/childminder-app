import { NextResponse } from 'next/server';
import { AuthError, NotFoundError } from '@/lib/errors';

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
