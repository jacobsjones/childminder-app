'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun, Monitor, Building2, Save } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getSettings, saveSettings } from '@/lib/store';

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

    const loadSettings = useCallback(async () => {
        // Sync from server
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const serverSettings = await response.json();
                setBusinessSettings(serverSettings);
                // Also update localStorage
                saveSettings(serverSettings);
            }
        } catch (error) {
            console.error('Failed to load settings from server:', error);
            // Fall back to localStorage
            setBusinessSettings(getSettings());
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

        // Save to client-side localStorage
        saveSettings(businessSettings);

        // Also save to server-side storage
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(businessSettings),
            });

            if (!response.ok) {
                console.error('Failed to save to server');
                alert('Settings saved locally but failed to sync to server. Please try again.');
            } else {
                alert('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Error saving to server:', error);
            alert('Settings saved locally but failed to sync to server. Please try again.');
        }

        setSaving(false);
    };

    const formatSortCode = (value) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        // Limit to 6 digits and add dashes
        const limited = digits.slice(0, 6);
        if (limited.length >= 5) {
            return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4, 6)}`;
        } else if (limited.length >= 3) {
            return `${limited.slice(0, 2)}-${limited.slice(2, 4)}`;
        }
        return limited;
    };

    const formatAccountNumber = (value) => {
        // Remove non-digits and limit to 8
        return value.replace(/\D/g, '').slice(0, 8);
    };

    return (
        <main>
            <header style={{ marginBottom: '2rem' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem' }}>
                    <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Back
                </Link>
                <h1>Settings</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Manage your app preferences and business information.
                </p>
            </header>

            {/* Appearance Section */}
            <section className="card" style={{ marginBottom: '2rem' }}>
                <h3>Appearance</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Choose your preferred theme.</p>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {themeOptions.map((opt) => {
                        const isActive = theme === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setTheme(opt.id)}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: isActive ? '2px solid var(--primary-blue-dark)' : '1px solid var(--border-color)',
                                    background: isActive ? 'var(--primary-blue)' : 'var(--bg-color)',
                                    color: isActive ? 'var(--primary-blue-text)' : 'var(--text-color)',
                                    fontWeight: isActive ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Business Details Section */}
            <form onSubmit={handleSave}>
                <section className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Building2 size={24} color="var(--primary-blue)" />
                        <h3 style={{ margin: 0 }}>Business Details</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        These details will appear on all generated invoices.
                    </p>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            <label>Business Name</label>
                            <input
                                type="text"
                                value={businessSettings.businessName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                                placeholder="e.g., Sarah's Childcare"
                                required
                            />

                            <label>Business Email</label>
                            <input
                                type="email"
                                value={businessSettings.businessEmail}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, businessEmail: e.target.value })}
                                placeholder="e.g., sarah@childcare.com"
                                required
                            />

                            <label>Bank Name</label>
                            <input
                                type="text"
                                value={businessSettings.bankName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, bankName: e.target.value })}
                                placeholder="e.g., Barclays"
                                required
                            />

                            <label>Account Name</label>
                            <input
                                type="text"
                                value={businessSettings.accountName}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, accountName: e.target.value })}
                                placeholder="e.g., S. Jones"
                                required
                            />

                            <div className="settings-grid" style={{ marginBottom: '1rem' }}>
                                <div className="w-full">
                                    <label>Sort Code</label>
                                    <input
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
                                    <label>Account Number</label>
                                    <input
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

                            <label>Payment Terms Note</label>
                            <textarea
                                value={businessSettings.paymentTermsNote}
                                onChange={(e) => setBusinessSettings({ ...businessSettings, paymentTermsNote: e.target.value })}
                                placeholder="e.g., Please pay within 7 days of invoice date."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-color)',
                                    fontFamily: 'inherit',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                }}
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-large bg-green"
                                style={{ marginTop: '1rem', width: '100%' }}
                            >
                                <Save />
                                {saving ? 'Saving...' : 'Save Business Details'}
                            </button>
                        </>
                    )}
                </section>
            </form>
        </main>
    );
}
