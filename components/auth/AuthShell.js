// Full-screen centred card for the signed-out pages. Fixed so it is not
// pushed sideways by the desktop sidebar's body padding.
export default function AuthShell({ title, subtitle, children }) {
    return (
        <main
            style={{
                position: 'fixed',
                inset: 0,
                overflowY: 'auto',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'max(1.5rem, env(safe-area-inset-top)) 1rem max(1.5rem, env(safe-area-inset-bottom))',
                zIndex: 'var(--z-drawer)',
            }}
        >
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <span className="brand" style={{ justifyContent: 'center' }}>
                        <span className="brand-dot" aria-hidden="true" />
                        LittleHours
                    </span>
                </div>
                <section className="card">
                    <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{title}</h1>
                    {subtitle && <p className="page-sub" style={{ marginBottom: '1.5rem' }}>{subtitle}</p>}
                    {children}
                </section>
            </div>
        </main>
    );
}

export function FormError({ message }) {
    if (!message) return null;
    return (
        <p
            role="alert"
            style={{
                background: 'var(--berry-soft)',
                color: 'var(--berry-deep)',
                borderRadius: 'var(--r-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                marginBottom: '1rem',
            }}
        >
            {message}
        </p>
    );
}
