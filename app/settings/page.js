'use client';
import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor, Building2, Save } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [businessSettings, setBusinessSettings] = useState({
        businessName: '',
        businessEmail: '',
        bankName: '',
        accountName: '',
        sortCode: '',
        accountNumber: '',
        paymentTermsNote: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const serverSettings = await response.json();
                setBusinessSettings(serverSettings);
            }
        } catch (error) {
            console.error('Failed to load settings from server:', error);
        }
        setLoading(false);
    }, []);

    const themeOptions = [
        { id: 'system', label: 'System', icon: <Monitor size={20} /> },
        { id: 'light', label: 'Light', icon: <Sun size={20} /> },
        { id: 'dark', label: 'Dark', icon: <Moon size={20} /> },
    ];

    useEffect(() => {
        const timer = setTimeout(() => loadSettings(), 0);
        return () => clearTimeout(timer);
    }, [loadSettings]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(businessSettings),
            });

            if (!response.ok) {
                console.error('Failed to save to server');
                alert('Failed to save settings. Please try again.');
            } else {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            }
        } catch (error) {
            console.error('Error saving to server:', error);
            alert('Failed to save settings. Please try again.');
        }

        setSaving(false);
    };

    const formatSortCode = (value) => {
        const digits = value.replace(/\D/g, '');
        const limited = digits.slice(0, 6);
        if (limited.length >= 5) {
            return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4, 6)}`;
        } else if (limited.length >= 3) {
            return `${limited.slice(0, 2)}-${limited.slice(2, 4)}`;
        }
        return limited;
    };

    const formatAccountNumber = (value) => {
        return value.replace(/\D/g, '').slice(0, 8);
    };

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Settings</h1>
                <p className="page-sub">Your preferences and the business details shown on invoices.</p>
            </header>

            {/* Appearance */}
            <section className="card" style={{ marginBottom: '1.5rem' }}>
                <h3>Appearance</h3>
                <p style={{ color: 'var(--ink-soft)', marginBottom: '1rem', fontSize: '0.95rem' }}>Pick a theme, or follow your device.</p>

                <div style={{ display: 'flex', gap: '0.6rem' }} role="group" aria-label="Theme">
                    {themeOptions.map((opt) => {
                        const isActive = theme === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setTheme(opt.id)}
                                aria-pressed={isActive}
                                style={{
                                    flex: 1,
                                    padding: '1rem 0.5rem',
                                    borderRadius: 'var(--r-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    border: isActive ? '2px solid var(--leaf)' : '1.5px solid var(--line)',
                                    background: isActive ? 'var(--leaf-soft)' : 'var(--surface)',
                                    color: isActive ? 'var(--leaf-deep)' : 'var(--ink)',
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'background var(--t-fast) var(--ease-out), border-color var(--t-fast) var(--ease-out)'
                                }}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Business Details */}
            <form onSubmit={handleSave}>
                <section className="card">
                    <div className="row" style={{ marginBottom: '0.5rem' }}>
                        <Building2 size={22} color="var(--leaf)" aria-hidden="true" />
                        <h3 style={{ margin: 0 }}>Business details</h3>
                    </div>
                    <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        These appear on every invoice you send.
                    </p>

                    {loading ? (
                        <div className="stack" aria-busy="true">
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ height: '3rem', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }} />
                            ))}
                        </div>
                    ) : (
                        <>
                            <label htmlFor="biz-name">Business name</label>
                            <input
                                id="biz-name"
                                type="text"
                                value={businessSettings.businessName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                                placeholder="e.g. Sue's Childcare"
                                required
                            />

                            <label htmlFor="biz-email">Business email</label>
                            <input
                                id="biz-email"
                                type="email"
                                value={businessSettings.businessEmail}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, businessEmail: e.target.value })}
                                placeholder="e.g. sue@childcare.com"
                                required
                            />

                            <label htmlFor="bank-name">Bank name</label>
                            <input
                                id="bank-name"
                                type="text"
                                value={businessSettings.bankName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, bankName: e.target.value })}
                                placeholder="e.g. Barclays"
                                required
                            />

                            <label htmlFor="account-name">Account name</label>
                            <input
                                id="account-name"
                                type="text"
                                value={businessSettings.accountName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, accountName: e.target.value })}
                                placeholder="e.g. S. Jones"
                                required
                            />

                            <div className="settings-grid" style={{ marginBottom: '1rem' }}>
                                <div className="w-full">
                                    <label htmlFor="sort-code">Sort code</label>
                                    <input
                                        id="sort-code"
                                        type="text"
                                        className="w-full"
                                        value={businessSettings.sortCode}
                                        onChange={(e) => setBusinessSettings({ ...businessSettings, sortCode: formatSortCode(e.target.value) })}
                                        placeholder="12-34-56"
                                        maxLength={8}
                                        required
                                        style={{ marginBottom: 0 }}
                                    />
                                </div>
                                <div className="w-full">
                                    <label htmlFor="account-number">Account number</label>
                                    <input
                                        id="account-number"
                                        type="text"
                                        className="w-full"
                                        value={businessSettings.accountNumber}
                                        onChange={(e) => setBusinessSettings({ ...businessSettings, accountNumber: formatAccountNumber(e.target.value) })}
                                        placeholder="12345678"
                                        maxLength={8}
                                        required
                                        style={{ marginBottom: 0 }}
                                    />
                                </div>
                            </div>

                            <label htmlFor="payment-terms">Payment terms note</label>
                            <textarea
                                id="payment-terms"
                                value={businessSettings.paymentTermsNote}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, paymentTermsNote: e.target.value })}
                                placeholder="e.g. Please pay within 7 days of the invoice date."
                                rows={4}
                                style={{ resize: 'vertical' }}
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: '0.5rem' }}
                            >
                                <Save size={20} />
                                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save business details'}
                            </button>
                        </>
                    )}
                </section>
            </form>
        </main>
    );
}
