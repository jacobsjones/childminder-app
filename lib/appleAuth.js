import { importPKCS8, SignJWT } from 'jose';

// Sign in with Apple stays switched off until every value is configured,
// so a half-finished Apple setup hides the button instead of breaking it.
export function isAppleConfigured() {
    return Boolean(
        process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY &&
        process.env.APPLE_APP_BUNDLE_IDENTIFIER
    );
}

// Vercel stores multi-line values as-is, but a key pasted on one line
// arrives with literal "\n" sequences.
function applePrivateKey() {
    return process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

// Apple wants a short-lived JWT as the client secret instead of a fixed
// string. It may not be valid for more than six months.
async function generateAppleClientSecret() {
    const key = await importPKCS8(applePrivateKey(), 'ES256');
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID })
        .setIssuer(process.env.APPLE_TEAM_ID)
        .setSubject(process.env.APPLE_CLIENT_ID)
        .setAudience('https://appleid.apple.com')
        .setIssuedAt(now)
        .setExpirationTime(now + 180 * 24 * 60 * 60)
        .sign(key);
}

/** The `socialProviders` entry for Better Auth, empty when Apple is not set up. */
export function appleSocialProviders() {
    if (!isAppleConfigured()) return {};
    return {
        apple: async () => ({
            // Services ID: used by the website's redirect flow
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: await generateAppleClientSecret(),
            // Bundle id: the audience of tokens from the native iOS sheet
            appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
        }),
    };
}
