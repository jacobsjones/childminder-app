'use client';
import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { authClient } from '@/lib/authClient';
import { guarded } from '@/components/auth/guarded';

// Native plugin compiled into the iOS app (ios/App/App/SceneDelegate.swift)
const NativeAppleSignIn = registerPlugin('AppleSignIn');

// 'web': redirect to Apple. 'native': the iOS sheet. null: hidden, e.g. an
// older iOS build without the plugin, where a redirect would open Safari.
function detectMode() {
    if (!Capacitor.isNativePlatform()) return 'web';
    return Capacitor.isPluginAvailable('AppleSignIn') ? 'native' : null;
}

const APPLE_ERROR = 'Sign in with Apple didn’t work. Please try again.';

export default function AppleSignInButton({ onError }) {
    const [mode, setMode] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMode(detectMode()), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!mode) return null;

    const handleClick = async () => {
        onError('');
        setBusy(true);
        const fail = (message) => { setBusy(false); onError(message); };
        await guarded(async () => {
            if (mode === 'web') {
                // Navigates away to Apple; the callback signs in and returns to '/'
                const { error } = await authClient.signIn.social({ provider: 'apple', callbackURL: '/' });
                if (error) fail(error.message || APPLE_ERROR);
                return;
            }

            try {
                const { identityToken, name } = await NativeAppleSignIn.authorize();
                // Apple only sends the name on the first authorization
                const [firstName, ...rest] = (name || '').trim().split(/\s+/);
                const user = firstName ? { name: { firstName, lastName: rest.join(' ') } } : undefined;
                const { error } = await authClient.signIn.social({
                    provider: 'apple',
                    idToken: { token: identityToken, user },
                });
                if (error) throw new Error(error.message);
                window.location.href = '/';
            } catch (error) {
                if (error?.code === 'CANCELED') return setBusy(false);
                console.error('Apple sign-in failed:', error);
                fail(APPLE_ERROR);
            }
        }, fail);
    };

    return (
        <>
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            className="btn btn-lg"
            style={{ width: '100%', background: '#000', color: '#fff', gap: '0.5rem' }}
        >
            <svg width="16" height="19" viewBox="0 0 16 19" aria-hidden="true" fill="currentColor">
                <path d="M13.2 10.1c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8C3.7 4.9 2.2 5.8 1.4 7.2c-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.4 2.9 2.4 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.2 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.4-.9-2.4-4.1zM11 3.2c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
            </svg>
            {busy ? 'Signing in…' : 'Sign in with Apple'}
        </button>
        <p style={{ textAlign: 'center', color: 'var(--ink-soft)', margin: '1rem 0', fontSize: '0.9rem' }}>or</p>
        </>
    );
}
