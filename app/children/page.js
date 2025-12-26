'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getChildren, saveChild } from '@/lib/store';

export default function ChildrenPage() {
    const [children, setChildren] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setChildren(getChildren());
    }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');

        if (name) {
            const newChild = { name, rate: 0 }; // Default, can edit details later
            saveChild(newChild);
            setChildren(getChildren());
            setIsAdding(false);
            // Optionally redirect to edit page immediately
            const created = getChildren().find(c => c.name === name);
            if (created) router.push(`/children/edit/${created.id}`);
        }
    };

    return (
        <main>
            <header style={{ marginBottom: '2rem' }}>
                <h1>Manage Children</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Tap a child to edit their profile & schedule.</p>
            </header>

            {/* List */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {children.map((child) => (
                    <Link href={`/children/edit/${child.id}`} key={child.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ marginBottom: 0, transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--bg-color)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700
                                }}>
                                    {child.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: '0.25rem' }}>{child.name}</h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {child.schedule?.enabled ? (
                                            <span style={{ color: 'var(--primary-green-text)', background: 'var(--primary-green)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>Fixed Schedule</span>
                                        ) : (
                                            'Pay-as-you-go'
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Add New Button/Form */}
            <div style={{ marginTop: '2rem' }}>
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-large bg-blue"
                        style={{ width: '100%' }}
                    >
                        <Plus /> Add New Child
                    </button>
                ) : (
                    <div className="card">
                        <form onSubmit={handleCreate}>
                            <h3>Add New Child</h3>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <input name="name" placeholder="Child's Name" required style={{ flex: 1 }} autoFocus />
                                <button type="submit" className="bg-blue" style={{ borderRadius: '0.5rem', padding: '0 1.5rem', fontWeight: 600 }}>Create</button>
                                <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </main>
    );
}
