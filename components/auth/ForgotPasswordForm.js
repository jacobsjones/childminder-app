'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import AuthShell, { FormError } from '@/components/auth/AuthShell';
import { guarded } from '@/components/auth/guarded';

// Two steps: email us your address, then type the 6-digit code with a new
// password. A typed code works inside the iOS app, unlike an email link.
export default function ForgotPasswordForm() {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const sendCode = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        await guarded(async () => {
            const { error: sendError } = await authClient.emailOtp.requestPasswordReset({ email });
            setBusy(false);
            if (sendError) {
                setError(sendError.message || 'Couldn’t send the code. Please try again.');
                return;
            }
            setStep('code');
        }, (message) => { setError(message); setBusy(false); });
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        await guarded(async () => {
            const { error: resetError } = await authClient.emailOtp.resetPassword({ email, otp, password });
            if (resetError) {
                setError(resetError.message || 'That code didn’t work. Please check it and try again.');
                setBusy(false);
                return;
            }
            // The password is changed and the code used up from here on, so if
            // signing in fails the only useful place to go is the sign-in page.
            let signedIn = false;
            try {
                const { error: signInError } = await authClient.signIn.email({ email, password, rememberMe: true });
                signedIn = !signInError;
            } catch {
                signedIn = false;
            }
            window.location.href = signedIn ? '/' : '/sign-in?reset=1';
        }, (message) => { setError(message); setBusy(false); });
    };

    if (step === 'email') {
        return (
            <AuthShell title="Reset your password" subtitle="We'll email you a 6-digit code.">
                <FormError message={error} />
                <form onSubmit={sendCode}>
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
                        {busy ? 'Sending…' : 'Send code'}
                    </button>
                </form>
                <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.95rem' }}>
                    <Link href="/sign-in">Back to sign in</Link>
                </p>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Check your email" subtitle={`If ${email} has an account, we've sent it a 6-digit code.`}>
            <FormError message={error} />
            <form onSubmit={resetPassword}>
                <label htmlFor="otp">Code</label>
                <input
                    id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
                />
                <label htmlFor="new-password">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
                    {busy ? 'Saving…' : 'Set new password'}
                </button>
            </form>
            <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.95rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
                    Use a different email
                </button>
            </p>
        </AuthShell>
    );
}
