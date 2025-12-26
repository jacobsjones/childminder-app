'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, Clock, Lock } from 'lucide-react';
import { getChild, saveChild, deleteAttendance } from '@/lib/store';

export default function EditProfile() {
    const { id } = useParams();
    const router = useRouter();
    const [child, setChild] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const data = getChild(id);
            if (data) {
                setChild(data);
            } else {
                router.push('/children'); // Not found
            }
            setLoading(false);
        }
    }, [id, router]);

    const handleSave = (e) => {
        e.preventDefault();
        saveChild(child);
        router.push('/children');
    };

    const toggleSchedule = (checked) => {
        setChild({
            ...child,
            schedule: {
                ...child.schedule,
                enabled: checked,
                days: checked ? (child.schedule?.days || []) : [], // Keep days if enabling, optional reset
                start: checked ? (child.schedule?.start || '08:00') : '',
                end: checked ? (child.schedule?.end || '17:00') : ''
            }
        });
    };

    if (loading || !child) return <div>Loading...</div>;

    const isScheduleEnabled = child.schedule?.enabled;

    return (
        <main>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <Link href="/children" style={{ marginRight: '1rem', color: 'var(--text-color)' }}><ArrowLeft /></Link>
                <h1>Edit Profile: {child.name}</h1>
            </header>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Basic Info */}
                <section className="card">
                    <h2 style={{ marginBottom: '1.5rem' }}>Basic Information</h2>

                    <label>Childs Name</label>
                    <input
                        value={child.name}
                        onChange={(e) => setChild({ ...child, name: e.target.value })}
                        required
                    />

                    <label>Hourly Rate (£)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={child.rate}
                        onChange={(e) => setChild({ ...child, rate: parseFloat(e.target.value) })}
                        required
                    />

                    <label>Parent Email</label>
                    <input
                        type="email"
                        value={child.email || ''}
                        onChange={(e) => setChild({ ...child, email: e.target.value })}
                        placeholder="parent@example.com"
                    />
                </section>

                {/* Fixed Booking Configuration */}
                <section className="card" style={{ border: isScheduleEnabled ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Calendar size={24} color="var(--primary-blue-text)" />
                                Scheduled / Fixed Booking
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Automatically log hours for this child.
                            </p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isScheduleEnabled || false}
                                onChange={(e) => toggleSchedule(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    {isScheduleEnabled ? (
                        <div className="animate-fade-in">
                            <h4 style={{ marginBottom: '0.5rem' }}>Days of the Week</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                                    const days = child.schedule?.days || [];
                                    const isSelected = days.includes(idx);
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                const newDays = isSelected ? days.filter(d => d !== idx) : [...days, idx];
                                                setChild({ ...child, schedule: { ...child.schedule, days: newDays } });
                                            }}
                                            style={{
                                                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                                                background: isSelected ? 'var(--primary-blue)' : 'var(--bg-color)',
                                                color: isSelected ? 'var(--primary-blue-text)' : 'var(--text-color)',
                                                border: isSelected ? 'none' : '1px solid var(--border-color)',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>

                            <h4 style={{ marginBottom: '0.5rem' }}>Standard Hours</h4>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '0.875rem' }}>Drop-off Time</label>
                                    <input
                                        type="time"
                                        value={child.schedule?.start || ''}
                                        onChange={(e) => setChild({ ...child, schedule: { ...child.schedule, start: e.target.value } })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <label style={{ fontSize: '0.875rem' }}>Pick-up Time</label>
                                    <input
                                        type="time"
                                        value={child.schedule?.end || ''}
                                        onChange={(e) => setChild({ ...child, schedule: { ...child.schedule, end: e.target.value } })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                <Lock size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                                Pay-as-you-go Mode
                            </p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                You will manually check this child in/out on the Dashboard.
                            </p>
                        </div>
                    )}
                </section>

                <button
                    type="submit"
                    className="btn-large bg-green"
                    style={{ position: 'sticky', bottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                >
                    <Save />
                    Save Changes
                </button>
            </form>

            <style jsx>{`
                .switch {
                  position: relative;
                  display: inline-block;
                  width: 50px;
                  height: 28px;
                }
                .switch input { 
                  opacity: 0;
                  width: 0;
                  height: 0;
                }
                .slider {
                  position: absolute;
                  cursor: pointer;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: var(--border-color);
                  transition: .4s;
                  border-radius: 34px;
                }
                .slider:before {
                  position: absolute;
                  content: "";
                  height: 20px;
                  width: 20px;
                  left: 4px;
                  bottom: 4px;
                  background-color: white;
                  transition: .4s;
                  border-radius: 50%;
                }
                input:checked + .slider {
                  background-color: var(--primary-green);
                }
                input:checked + .slider:before {
                  transform: translateX(22px);
                }
            `}</style>
        </main>
    );
}
