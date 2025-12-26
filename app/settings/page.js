'use client';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const options = [
        { id: 'system', label: 'System', icon: <Monitor size={20} /> },
        { id: 'light', label: 'Light', icon: <Sun size={20} /> },
        { id: 'dark', label: 'Dark', icon: <Moon size={20} /> },
    ];

    return (
        <main>
            <header style={{ marginBottom: '2rem' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1rem' }}>
                    <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Back
                </Link>
                <h1>Settings</h1>
            </header>

            <section className="card">
                <h3>Appearance</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Choose your preferred theme.</p>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {options.map((opt) => {
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
                                    fontWeight: isActive ? 600 : 400
                                }}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
