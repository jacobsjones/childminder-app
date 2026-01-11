'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Banknote, Settings } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path || (path !== '/' && pathname.startsWith(path));

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Manage', path: '/children', icon: Users },
        { name: 'Invoicing', path: '/finances', icon: Banknote },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="desktop-nav">
                <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LittleHours</h2>
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
