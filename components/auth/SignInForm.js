'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import AuthShell, { FormError } from '@/components/auth/AuthShell';
import AppleSignInButton from '@/components/auth/AppleSignInButton';

export default function SignInForm({ appleEnabled }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');

        const { error: signInError } = await authClient.signIn.email({ email, password, rememberMe: true });
        if (signInError) {
            setError(signInError.code === 'INVALID_EMAIL_OR_PASSWORD'
                ? 'That email and password don’t match.'
                : signInError.message || 'Couldn’t sign in. Please try again.');
            setBusy(false);
            return;
        }
        window.location.href = '/';
    };

    return (
        <AuthShell title="Welcome back" subtitle="Sign in to your LittleHours account.">
            <FormError message={error} />

            {appleEnabled && (
                <>
                    <AppleSignInButton onError={setError} />
                    <p style={{ textAlign: 'center', color: 'var(--ink-soft)', margin: '1rem 0', fontSize: '0.9rem' }}>or</p>
                </>
            )}

            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <div className="stack" style={{ gap: '0.5rem', marginTop: '1.25rem', textAlign: 'center', fontSize: '0.95rem' }}>
                <Link href="/forgot-password">Forgot your password?</Link>
                <span>New here? <Link href="/sign-up">Create an account</Link></span>
            </div>
        </AuthShell>
    );
}
