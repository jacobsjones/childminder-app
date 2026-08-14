'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Sunrise, Trash2 } from 'lucide-react';

export default function EditProfile() {
    const { id } = useParams();
    const router = useRouter();
    const [child, setChild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (id) {
            const load = async () => {
                try {
                    const response = await fetch(`/api/children/${id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setChild(data.child);
                    } else {
                        router.push('/children');
                    }
                } catch (error) {
                    console.error('Failed to load child:', error);
                    router.push('/children');
                }
                setLoading(false);
            };
            load();
        }
    }, [id, router]);

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(child),
            });

            if (response.ok) {
                router.push('/children');
            } else {
                console.error('Failed to save to server');
                alert('Failed to save changes');
            }
        } catch (error) {
            console.error('Error saving to server:', error);
            alert('Failed to save changes');
        }
    };

    const handleRemoveChild = async () => {
        const confirmed = confirm(
            `Remove ${child.name}? This permanently deletes their profile and all logged hours and invoices. This can't be undone.`
        );
        if (!confirmed) return;

        setRemoving(true);
        try {
            const response = await fetch(`/api/children/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteType: 'child' }),
            });

            if (response.ok) {
                router.push('/children');
            } else {
                console.error('Failed to remove child');
                alert('Failed to remove child');
                setRemoving(false);
            }
        } catch (error) {
            console.error('Error removing child:', error);
            alert('Failed to remove child');
            setRemoving(false);
        }
    };

    const toggleSchedule = (checked) => {
        setChild({
            ...child,
            schedule: {
                ...child.schedule,
                enabled: checked,
                days: checked ? (child.schedule?.days || []) : [],
                start: checked ? (child.schedule?.start || '08:00') : '',
                end: checked ? (child.schedule?.end || '17:00') : ''
            }
        });
    };

    if (loading || !child) {
        return (
            <main aria-busy="true">
                <div className="card" style={{ height: '14rem', background: 'var(--surface-2)', border: 'none' }} />
            </main>
        );
    }

    const isScheduleEnabled = child.schedule?.enabled;

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <Link href="/children" className="back-link">
                    <ArrowLeft size={20} /> All children
                </Link>
                <h1 style={{ marginBottom: 0 }}>{child.name}&apos;s profile</h1>
            </header>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Basic Info */}
                <section className="card" style={{ marginBottom: 0 }}>
                    <h2 style={{ marginBottom: '1.25rem' }}>The basics</h2>

                    <label htmlFor="child-name">Child&apos;s name</label>
                    <input
                        id="child-name"
                        value={child.name}
                        onChange={(e) => setChild({ ...child, name: e.target.value })}
                        required
                    />

                    <label htmlFor="child-rate">Hourly rate (£)</label>
                    <input
                        id="child-rate"
                        type="number"
                        step="0.01"
                        value={child.rate}
                        onChange={(e) => setChild({ ...child, rate: parseFloat(e.target.value) })}
                        required
                    />

                    <label htmlFor="parent-email">Parent&apos;s email</label>
                    <input
                        id="parent-email"
                        type="email"
                        value={child.email || ''}
                        onChange={(e) => setChild({ ...child, email: e.target.value })}
                        placeholder="parent@example.com"
                        style={{ marginBottom: 0 }}
                    />
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
                        Invoices get emailed here each month.
                    </p>
                </section>

                {/* Schedule */}
                <section
                    className="card"
                    style={{
                        marginBottom: 0,
                        borderColor: isScheduleEnabled ? 'var(--leaf)' : 'var(--line)',
                        borderWidth: isScheduleEnabled ? '2px' : '1px',
                        borderStyle: 'solid',
                        transition: 'border-color var(--t-med)'
                    }}
                >
                    <div className="row-between" style={{ marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <Calendar size={22} color="var(--leaf)" aria-hidden="true" />
                                Fixed schedule
                            </h2>
                            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                                Log the same hours automatically each week.
                            </p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isScheduleEnabled || false}
                                onChange={(e) => toggleSchedule(e.target.checked)}
                                aria-label="Enable fixed schedule"
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {isScheduleEnabled ? (
                        <div>
                            <h4 style={{ marginBottom: '0.6rem' }}>Days of the week</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                                    const days = child.schedule?.days || [];
                                    const isSelected = days.includes(idx);
                                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                const newDays = isSelected ? days.filter(d => d !== idx) : [...days, idx];
                                                setChild({ ...child, schedule: { ...child.schedule, days: newDays } });
                                            }}
                                            className={`day-pill ${isSelected ? 'selected' : ''}`}
                                            aria-pressed={isSelected}
                                            aria-label={dayNames[idx]}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>

                            <h4 style={{ marginBottom: '0.6rem' }}>Usual hours</h4>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label htmlFor="dropoff">Drop-off</label>
                                    <input
                                        id="dropoff"
                                        type="time"
                                        value={child.schedule?.start || ''}
                                        onChange={(e) => setChild({ ...child, schedule: { ...child.schedule, start: e.target.value } })}
                                        style={{ marginBottom: 0 }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label htmlFor="pickup">Pick-up</label>
                                    <input
                                        id="pickup"
                                        type="time"
                                        value={child.schedule?.end || ''}
                                        onChange={(e) => setChild({ ...child, schedule: { ...child.schedule, end: e.target.value } })}
                                        style={{ marginBottom: 0 }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--ink-soft)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Sunrise size={17} aria-hidden="true" />
                                Pay as you go
                            </p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--ink-soft)', marginLeft: 'auto', marginRight: 'auto' }}>
                                You&apos;ll log {child.name}&apos;s hours by hand on the Home screen.
                            </p>
                        </div>
                    )}
                </section>

                {/* Danger zone */}
                <section className="card" style={{ marginBottom: 0 }}>
                    <h2 style={{ marginBottom: '0.4rem' }}>Remove child</h2>
                    <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Permanently deletes {child.name}&apos;s profile, along with all logged hours and invoices.
                    </p>
                    <button
                        type="button"
                        onClick={handleRemoveChild}
                        disabled={removing}
                        className="btn btn-danger-soft"
                    >
                        <Trash2 size={18} />
                        {removing ? 'Removing…' : `Remove ${child.name}`}
                    </button>
                </section>

                <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', boxShadow: 'var(--shadow-md)' }}
                >
                    <Save size={20} />
                    Save changes
                </button>
            </form>
        </main>
    );
}
