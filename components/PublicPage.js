import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Readable full-page layout for the public pages (privacy, support). Fixed
// like AuthShell so the desktop sidebar's body padding doesn't shift it, but
// top-aligned because these pages are long.
export default function PublicPage({ title, subtitle, children }) {
    return (
        <main
            className="public-page"
            style={{
                position: 'fixed',
                inset: 0,
                overflowY: 'auto',
                background: 'var(--bg)',
                padding: 'max(1.5rem, env(safe-area-inset-top)) 1rem max(2rem, env(safe-area-inset-bottom))',
                zIndex: 'var(--z-drawer)',
            }}
        >
            <style>{`
                .public-page a { color: var(--leaf-deep); }
                .public-page h2 { font-size: 1.2rem; margin: 2rem 0 0.5rem; }
                .public-page h2:first-child { margin-top: 0; }
                .public-page p, .public-page li { line-height: 1.6; }
                .public-page ul { padding-left: 1.25rem; margin: 0 0 1rem; }
                .public-page li { margin-bottom: 0.4rem; }
            `}</style>
            <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
                <div className="row-between" style={{ marginBottom: '1.5rem' }}>
                    <span className="brand">
                        <span className="brand-dot" aria-hidden="true" />
                        LittleHours
                    </span>
                    <Link href="/" className="btn btn-ghost" style={{ gap: '0.35rem' }}>
                        <ArrowLeft size={18} aria-hidden="true" /> Back to app
                    </Link>
                </div>
                <header style={{ marginBottom: '1.25rem' }}>
                    <h1 style={{ marginBottom: '0.25rem' }}>{title}</h1>
                    {subtitle && <p className="page-sub">{subtitle}</p>}
                </header>
                <article className="card">{children}</article>
            </div>
        </main>
    );
}
