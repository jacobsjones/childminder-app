'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import AuthShell, { FormError } from '@/components/auth/AuthShell';
import AppleSignInButton from '@/components/auth/AppleSignInButton';

export default function SignUpForm({ appleEnabled }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');

        const { error: signUpError } = await authClient.signUp.email({ name, email, password });
        if (signUpError) {
            setError(signUpError.message || 'Couldn’t create your account. Please try again.');
            setBusy(false);
            return;
        }
        window.location.href = '/';
    };

    return (
        <AuthShell title="Create your account" subtitle="Track hours and send invoices for the children you care for.">
            <FormError message={error} />

            {appleEnabled && (
                <>
                    <AppleSignInButton onError={setError} />
                    <p style={{ textAlign: 'center', color: 'var(--ink-soft)', margin: '1rem 0', fontSize: '0.9rem' }}>or</p>
                </>
            )}

            <form onSubmit={handleSubmit}>
                <label htmlFor="name">Your name</label>
                <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />

                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: '-0.6rem 0 1rem' }}>At least 8 characters.</p>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
                    {busy ? 'Creating account…' : 'Create account'}
                </button>
            </form>

            <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.95rem' }}>
                Already have an account? <Link href="/sign-in">Sign in</Link>
            </p>
        </AuthShell>
    );
}
