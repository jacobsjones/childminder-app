'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Banknote, Settings } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path || (path !== '/' && pathname.startsWith(path));

    const navItems = [
        { name: 'Home', path: '/', icon: LayoutDashboard },
        { name: 'Children', path: '/children', icon: Users },
        { name: 'Invoices', path: '/finances', icon: Banknote },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="desktop-nav" aria-label="Main navigation">
                <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                    <span className="brand">
                        <span className="brand-dot" aria-hidden="true" />
                        LittleHours
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                            aria-current={isActive(item.path) ? 'page' : undefined}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile floating pill bar */}
            <nav className="mobile-nav" aria-label="Main navigation">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                        aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                        <item.icon size={22} />
                        <span style={{ fontSize: '0.68rem' }}>{item.name}</span>
                    </Link>
                ))}
            </nav>
        </>
    );
}
