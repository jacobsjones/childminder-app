import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AuthError } from '@/lib/errors';

/** The signed-in user for this request. Throws AuthError when signed out. */
export async function requireUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new AuthError();
    return session.user;
}
