import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAuthPage } from '@/lib/authPaths';

// Signed-out visitors to any app page go to /sign-in. API routes are not
// matched here: each one checks the session itself and answers 401.
export async function proxy(request) {
    if (isAuthPage(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Everything except API routes, Next.js internals and files with an extension
    matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
