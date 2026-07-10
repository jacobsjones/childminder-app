'use client';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash, Plus } from 'lucide-react';
import ManualEntryModal from '@/components/ManualEntryModal';

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function ChildProfile({ params }) {
    const { id } = use(params);
    const router = useRouter();

    const [child, setChild] = useState(null);
    const [history, setHistory] = useState([]);
    const [totalHoursAllTime, setTotalHoursAllTime] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ hours: 0, date: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const response = await fetch(`/api/children/${id}`);
            if (!response.ok) throw new Error('Failed to load data');

            const data = await response.json();
            setChild(data.child);

            const childHistory = data.attendance
                .filter(a => a.hours !== undefined || a.endTime)
                .sort((a, b) => {
                    const dateA = a.date ? new Date(a.date) : new Date(a.startTime);
                    const dateB = b.date ? new Date(b.date) : new Date(b.startTime);
                    return dateB - dateA;
                });
            setHistory(childHistory);
            setTotalHoursAllTime((data.totalHours || 0).toFixed(1));
        } catch (error) {
            console.error('Failed to load child data:', error);
        }
    }, [id]);

    useEffect(() => {
        const timer = setTimeout(() => loadData(), 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    const getRecordHours = (record) => {
        if (record.hours !== undefined) {
            return record.hours;
        }
        if (record.startTime && record.endTime) {
            const s = new Date(record.startTime);
            const e = new Date(record.endTime);
            return Math.max(0, (e - s) / (1000 * 60 * 60));
        }
        return 0;
    };

    const getMonthlyData = () => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const data = Array(daysInMonth).fill(0);

        history.forEach(item => {
            const itemDate = item.date ? new Date(item.date) : new Date(item.startTime);
            if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
                const day = itemDate.getDate() - 1;
                data[day] += getRecordHours(item);
            }
        });
        return data;
    };

    const monthlyData = getMonthlyData();
    const maxHours = Math.max(...monthlyData, 0);
    const chartMax = maxHours > 0 ? maxHours + 2 : 12;

    const startEdit = (item) => {
        setEditingId(item.id);
        if (item.hours !== undefined) {
            setEditForm({
                hours: item.hours,
                date: item.date
            });
        } else {
            const toLocal = (d) => new Date(d).toISOString().slice(0, 16);
            setEditForm({
                start: toLocal(item.startTime),
                end: toLocal(item.endTime)
            });
        }
    };

    const saveEdit = async (originalItem) => {
        try {
            if (originalItem.hours !== undefined) {
                const hours = parseFloat(editForm.hours);
                await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'logHours',
                        childId: parseInt(id),
                        date: editForm.date,
                        hours,
                    }),
                });
            } else {
                const updated = {
                    ...originalItem,
                    childId: parseInt(id),
                    startTime: new Date(editForm.start).toISOString(),
                    endTime: new Date(editForm.end).toISOString()
                };
                await fetch(`/api/children/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateAttendance', ...updated }),
                });
            }
            setEditingId(null);
            await loadData();
        } catch (error) {
            console.error('Error saving edit:', error);
        }
    };

    const handleManualSave = async ({ date, hours }) => {
        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'logHours',
                    childId: parseInt(id),
                    date,
                    hours,
                }),
            });

            if (response.ok) {
                await loadData();
            } else {
                console.error('Failed to save to server');
            }
        } catch (error) {
            console.error('Error saving to server:', error);
        }
    };

    const handleDelete = async (itemId) => {
        if (confirm('Are you sure you want to delete this record?')) {
            try {
                const response = await fetch('/api/attendance', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: itemId }),
                });

                if (response.ok) {
                    await loadData();
                }
            } catch (error) {
                console.error('Error deleting attendance:', error);
            }
        }
    };

    if (!child) {
        return (
            <main aria-busy="true">
                <div className="card" style={{ height: '7rem', background: 'var(--surface-2)', border: 'none' }} />
                <div className="card" style={{ height: '12rem', background: 'var(--surface-2)', border: 'none' }} />
            </main>
        );
    }

    const sum = nameHash(child.name);

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <button onClick={() => router.back()} className="back-link">
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div className="row" style={{ gap: '1rem' }}>
                        <div className={`avatar avatar-lg blob-${sum % 4}`} aria-hidden="true">
                            {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ marginBottom: '0.3rem' }}>{child.name}</h1>
                            <span className="chip chip-sun">£{child.rate}/hr</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span className="stat-number" style={{ display: 'block', fontSize: '1.9rem', color: 'var(--leaf-deep)' }}>
                            {totalHoursAllTime}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>total hours</span>
                    </div>
                </div>
            </header>

            {/* Monthly chart */}
            <section className="card">
                <h3>This month</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '150px', paddingBottom: '5px', fontSize: '0.7rem', color: 'var(--ink-soft)', minWidth: '24px', textAlign: 'right', paddingRight: '0.25rem' }}>
                        <span>{chartMax}h</span>
                        <span>{Math.round(chartMax * 0.66)}h</span>
                        <span>{Math.round(chartMax * 0.33)}h</span>
                        <span>0h</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '3px', overflowX: 'auto', paddingBottom: '5px', flex: 1 }}>
                        {monthlyData.map((val, idx) => {
                            const height = (val / chartMax) * 100;
                            const isOvertime = val > 8;
                            return (
                                <div key={idx} style={{ flex: 1, minWidth: '8px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <div
                                        title={`Day ${idx + 1}: ${val.toFixed(1)}h`}
                                        style={{
                                            width: '100%',
                                            height: `${height}%`,
                                            background: isOvertime ? 'var(--sky)' : 'var(--leaf)',
                                            borderRadius: 'var(--r-pill)',
                                            minHeight: val > 0 ? '8px' : '0',
                                            transition: 'height var(--t-med) var(--ease-out)'
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--ink-soft)', marginLeft: '28px' }}>
                    <span>1st</span>
                    <span>15th</span>
                    <span>End</span>
                </div>
                {maxHours > 8 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.6rem' }}>
                        <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', background: 'var(--sky)', borderRadius: '50%', marginRight: '0.35em' }} aria-hidden="true" />
                        Days over 8 hours
                    </p>
                )}
            </section>

            {/* History */}
            <div className="row-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Attendance history</h3>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-soft" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <Plus size={17} /> Add record
                </button>
            </div>
            <div className="stack" style={{ gap: '0.75rem' }}>
                {history.map((item) => {
                    const isEditing = editingId === item.id;
                    const hours = getRecordHours(item);
                    const dateStr = item.date
                        ? new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                        : new Date(item.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                    return (
                        <div key={item.id} className="card" style={{ marginBottom: 0, padding: '1rem 1.25rem' }}>
                            {isEditing ? (
                                <div className="stack" style={{ gap: '0.5rem' }}>
                                    {item.hours !== undefined ? (
                                        <>
                                            <label>Date</label>
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                style={{ marginBottom: 0 }}
                                            />
                                            <label>Hours</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                value={editForm.hours}
                                                onChange={e => setEditForm({ ...editForm, hours: parseFloat(e.target.value) || 0 })}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <label>Start</label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.start}
                                                onChange={e => setEditForm({ ...editForm, start: e.target.value })}
                                                style={{ marginBottom: 0 }}
                                            />
                                            <label>End</label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.end}
                                                onChange={e => setEditForm({ ...editForm, end: e.target.value })}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </>
                                    )}
                                    <div className="row" style={{ marginTop: '0.5rem' }}>
                                        <button onClick={() => saveEdit(item)} className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                                        <button onClick={() => setEditingId(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="row-between">
                                    <div>
                                        <h4 style={{ marginBottom: '0.2rem' }}>{dateStr}</h4>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
                                            {item.hours !== undefined ? (
                                                `${item.hours} hours`
                                            ) : (
                                                <>
                                                    {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                                                    {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="stat-number" style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{hours.toFixed(1)}h</div>
                                        <div className="row" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => startEdit(item)} className="btn btn-ghost btn-icon" style={{ width: '38px', height: '38px' }} aria-label={`Edit record for ${dateStr}`}>
                                                <Edit2 size={17} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="btn btn-danger-soft btn-icon" style={{ width: '38px', height: '38px' }} aria-label={`Delete record for ${dateStr}`}>
                                                <Trash size={17} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                {history.length === 0 && (
                    <div className="card empty-state" style={{ marginBottom: 0 }}>
                        <span className="empty-emoji" aria-hidden="true">📅</span>
                        <p style={{ margin: '0 auto' }}>No hours logged yet — they&apos;ll appear here once you log a day.</p>
                    </div>
                )}
            </div>

            <ManualEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleManualSave}
                existingDates={history.filter(h => h.date).map(h => h.date)}
            />
        </main>
    );
}
