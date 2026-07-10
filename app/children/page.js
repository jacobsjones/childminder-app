'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight } from 'lucide-react';

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function ChildrenPage() {
    const [children, setChildren] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const response = await fetch('/api/children');
                if (response.ok) {
                    const data = await response.json();
                    setChildren(data);
                }
            } catch (error) {
                console.error('Failed to load children:', error);
            }
        };
        load();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');

        if (name) {
            try {
                const newChild = { name, rate: 0 };
                const response = await fetch('/api/children', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newChild)
                });

                if (response.ok) {
                    const created = await response.json();
                    setIsAdding(false);
                    if (created.id) {
                        router.push(`/children/edit/${created.id}`);
                    }
                }
            } catch (error) {
                console.error('Failed to create child:', error);
            }
        }
    };

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Children</h1>
                <p className="page-sub">Tap a child to edit their profile and schedule.</p>
            </header>

            {children.length === 0 && !isAdding && (
                <section className="card empty-state">
                    <span className="empty-emoji" aria-hidden="true">🧸</span>
                    <h2 style={{ color: 'var(--ink)' }}>Nobody here yet</h2>
                    <p style={{ margin: '0 auto 0.5rem' }}>Add each child you look after — their rate, schedule and parent email live here.</p>
                </section>
            )}

            <div className="stack">
                {children.map((child) => {
                    const sum = nameHash(child.name);
                    return (
                        <Link href={`/children/edit/${child.id}`} key={child.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card card-tap row-between" style={{ marginBottom: 0 }}>
                                <div className="row">
                                    <div className={`avatar blob-${sum % 4}`} aria-hidden="true">
                                        {child.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>{child.name}</h3>
                                        <div style={{ marginTop: '0.3rem' }}>
                                            {child.schedule?.enabled ? (
                                                <span className="chip chip-sky">Fixed schedule</span>
                                            ) : (
                                                <span className="chip chip-plain">Pay as you go</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--ink-soft)" aria-hidden="true" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn btn-primary btn-lg"
                    >
                        <Plus size={20} /> Add a child
                    </button>
                ) : (
                    <div className="card">
                        <form onSubmit={handleCreate}>
                            <h3>New child</h3>
                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                <input
                                    name="name"
                                    placeholder="Child's name"
                                    required
                                    autoFocus
                                    style={{ flex: '1 1 180px', marginBottom: 0 }}
                                />
                                <button type="submit" className="btn btn-primary">Create</button>
                                <button type="button" onClick={() => setIsAdding(false)} className="btn btn-ghost">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </main>
    );
}
