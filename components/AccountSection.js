'use client';
import { useEffect, useState } from 'react';
import { UserRound, LogOut, KeyRound, Trash2 } from 'lucide-react';
import { authClient } from '@/lib/authClient';
import { FormError } from '@/components/auth/AuthShell';
import { guarded } from '@/components/auth/guarded';

export default function AccountSection() {
    const { data: session } = authClient.useSession();
    // Apple-only accounts have no password to change or confirm with
    const [hasPassword, setHasPassword] = useState(true);
    const [panel, setPanel] = useState(null);
    const [signOutError, setSignOutError] = useState('');

    useEffect(() => {
        let cancelled = false;
        authClient.listAccounts().then(({ data }) => {
            if (!cancelled && Array.isArray(data)) {
                setHasPassword(data.some((a) => (a.providerId ?? a.provider) === 'credential'));
            }
        }).catch((error) => console.error('Could not load accounts:', error));
        return () => { cancelled = true; };
    }, []);

    const signOut = async () => {
        setSignOutError('');
        await guarded(async () => {
            await authClient.signOut();
            window.location.href = '/sign-in';
        }, setSignOutError);
    };

    return (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="row" style={{ marginBottom: '0.5rem' }}>
                <UserRound size={22} color="var(--leaf)" aria-hidden="true" />
                <h3 style={{ margin: 0 }}>Account</h3>
            </div>
            <p style={{ color: 'var(--ink-soft)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                Signed in as <strong style={{ color: 'var(--ink)' }}>{session?.user?.email || '…'}</strong>
            </p>

            <div className="row" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
                {hasPassword && (
                    <button type="button" className="btn btn-outline" onClick={() => setPanel(panel === 'password' ? null : 'password')}>
                        <KeyRound size={18} /> Change password
                    </button>
                )}
                <button type="button" className="btn btn-outline" onClick={signOut}>
                    <LogOut size={18} /> Sign out
                </button>
                <button type="button" className="btn btn-danger-soft" onClick={() => setPanel(panel === 'delete' ? null : 'delete')}>
                    <Trash2 size={18} /> Delete account
                </button>
            </div>

            <FormError message={signOutError} />
            {panel === 'password' && <ChangePasswordForm onDone={() => setPanel(null)} />}
            {panel === 'delete' && <DeleteAccountForm hasPassword={hasPassword} onCancel={() => setPanel(null)} />}
        </section>
    );
}

function ChangePasswordForm({ onDone }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        await guarded(async () => {
            const { error: changeError } = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            setBusy(false);
            if (changeError) {
                setError(changeError.code === 'INVALID_PASSWORD'
                    ? 'Your current password isn’t right.'
                    : changeError.message || 'Couldn’t change your password.');
                return;
            }
            setDone(true);
            setTimeout(onDone, 1500);
        }, (message) => { setError(message); setBusy(false); });
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
            <FormError message={error} />
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <button type="submit" className="btn btn-primary" disabled={busy || done}>
                {done ? 'Password changed' : busy ? 'Saving…' : 'Save new password'}
            </button>
        </form>
    );
}

function DeleteAccountForm({ hasPassword, onCancel }) {
    const [confirmText, setConfirmText] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        await guarded(async () => {
            const { error: deleteError } = await authClient.deleteUser(hasPassword ? { password } : {});
            if (deleteError) {
                setBusy(false);
                if (deleteError.code === 'INVALID_PASSWORD') {
                    setError('That password isn’t right.');
                } else if (!hasPassword) {
                    // Apple-only accounts need a recent sign-in instead of a password
                    setError('For your security, please sign out, sign back in with Apple, then try again.');
                } else {
                    setError(deleteError.message || 'Couldn’t delete your account.');
                }
                return;
            }
            window.location.href = '/sign-up';
        }, (message) => { setError(message); setBusy(false); });
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
            <p style={{ marginBottom: '1rem' }}>
                This permanently deletes your account and every child, hour, invoice and setting in it. It can&apos;t be undone.
            </p>
            <FormError message={error} />
            {hasPassword && (
                <>
                    <label htmlFor="delete-password">Your password</label>
                    <input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </>
            )}
            <label htmlFor="delete-confirm">Type DELETE to confirm</label>
            <input id="delete-confirm" type="text" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required />
            <div className="row" style={{ gap: '0.6rem' }}>
                <button type="submit" className="btn btn-danger-soft" disabled={busy || confirmText !== 'DELETE'}>
                    {busy ? 'Deleting…' : 'Delete my account'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
}
