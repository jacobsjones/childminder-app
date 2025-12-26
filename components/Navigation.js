'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Banknote, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Navigation() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const isActive = (path) => pathname === path || (path !== '/' && pathname.startsWith(path));

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Manage', path: '/children', icon: Users },
        { name: 'Finances', path: '/finances', icon: Banknote },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="desktop-nav">
                <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Childminder</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </div>

                {/* Theme Toggle in Sidebar */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="nav-item"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Bar */}
            <nav className="mobile-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                    >
                        <item.icon size={24} />
                        <span style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>{item.name}</span>
                    </Link>
                ))}
            </nav>
        </>
    );
}
