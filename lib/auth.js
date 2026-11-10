import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { Pool } from 'pg';
import { appleSocialProviders } from '@/lib/appleAuth';
import { sendPasswordResetCode } from '@/lib/authEmails';

// One pool per server instance, also across dev hot reloads.
const pool = globalThis.__littleHoursAuthPool ?? new Pool({ connectionString: process.env.POSTGRES_URL });
globalThis.__littleHoursAuthPool = pool;

export const auth = betterAuth({
    database: pool,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        autoSignIn: true,
    },
    session: {
        // Childminders sign in rarely: keep them signed in for 60 days,
        // extended every day the app is used.
        expiresIn: 60 * 60 * 24 * 60,
        updateAge: 60 * 60 * 24,
    },
    user: {
        // App Store guideline 5.1.1(v): accounts must be deletable in-app.
        // Children, hours, invoices and settings go with the user through
        // ON DELETE CASCADE on their user_id columns.
        deleteUser: { enabled: true },
    },
    account: {
        // Signing in with Apple using the same email as an existing
        // password account opens that same account.
        accountLinking: { enabled: true, trustedProviders: ['apple'] },
    },
    socialProviders: appleSocialProviders(),
    trustedOrigins: ['https://appleid.apple.com'],
    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 600,
            disableSignUp: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === 'forget-password') {
                    await sendPasswordResetCode(email, otp);
                }
            },
        }),
    ],
});
