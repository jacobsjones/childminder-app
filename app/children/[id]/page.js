'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Save, Trash, X, Plus } from 'lucide-react';
import { getChild, getAttendance, updateAttendance, deleteAttendance, logHours, getTotalHoursForChild } from '@/lib/store';
import ManualEntryModal from '@/components/ManualEntryModal';

export default function ChildProfile({ params }) {
    // Unwrap params using React.use()
    const { id } = use(params);
    const router = useRouter();

    const [child, setChild] = useState(null);
    const [history, setHistory] = useState([]);
    const [totalHoursAllTime, setTotalHoursAllTime] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ hours: 0, date: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        const childData = await getChild(id);
        setChild(childData);
        
        const allAttendance = await getAttendance();
        // Support both hours-based and time-based records
        const childHistory = allAttendance
            .filter(a => a.childId === id && (a.hours !== undefined || a.endTime))
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(a.startTime);
                const dateB = b.date ? new Date(b.date) : new Date(b.startTime);
                return dateB - dateA;
            });
        setHistory(childHistory);

        const total = await getTotalHoursForChild(id);
        setTotalHoursAllTime(total.toFixed(1));
    }, [id]);

    useEffect(() => {
        const timer = setTimeout(() => loadData(), 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    const getRecordHours = (record) => {
        // New hours-based system
        if (record.hours !== undefined) {
            return record.hours;
        }
        // Old time-based system (backward compatibility)
        if (record.startTime && record.endTime) {
            const s = new Date(record.startTime);
            const e = new Date(record.endTime);
            return Math.max(0, (e - s) / (1000 * 60 * 60));
        }
        return 0;
    };

    // --- Analytics Data ---
    const getMonthlyData = () => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const data = Array(daysInMonth).fill(0);

        history.forEach(item => {
            const itemDate = item.date ? new Date(item.date) : new Date(item.startTime);
            if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
                const day = itemDate.getDate() - 1; // 0-indexed
                data[day] += getRecordHours(item);
            }
        });
        return data;
    };

    const monthlyData = getMonthlyData();

    // Calculate dynamic max for chart scaling
    const maxHours = Math.max(...monthlyData, 0);
    const chartMax = maxHours > 0 ? maxHours + 2 : 12;

    // --- Editing Handlers ---
    const startEdit = (item) => {
        setEditingId(item.id);
        if (item.hours !== undefined) {
            // Hours-based record
            setEditForm({
                hours: item.hours,
                date: item.date
            });
        } else {
            // Time-based record (legacy)
            const toLocal = (d) => new Date(d).toISOString().slice(0, 16);
            setEditForm({
                start: toLocal(item.startTime),
                end: toLocal(item.endTime)
            });
        }
    };

    const saveEdit = async (originalItem) => {
        if (originalItem.hours !== undefined) {
            // Update hours-based record
            const hours = parseFloat(editForm.hours);
            await logHours(id, hours, editForm.date);

            // Also save to server (Legacy sync, KV already handles it via logHours if we changed imports, but keeping for now)
            try {
                await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        childId: id,
                        date: editForm.date,
                        hours,
                    }),
                });
            } catch (error) {
                console.error('Error saving to server:', error);
            }
        } else {
            // Update time-based record (legacy)
            const updated = {
                ...originalItem,
                startTime: new Date(editForm.start).toISOString(),
                endTime: new Date(editForm.end).toISOString()
            };
            await updateAttendance(updated);
        }
        setEditingId(null);
        await loadData();
        router.refresh();
    };

    const handleManualSave = async ({ date, hours }) => {
        // Save to Store (KV)
        await logHours(id, hours, date);

        // Also save to server-side storage (Legacy sync)
        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    childId: id,
                    date,
                    hours,
                }),
            });

            if (!response.ok) {
                console.error('Failed to save to server');
            }
        } catch (error) {
            console.error('Error saving to server:', error);
        }

        await loadData();
        router.refresh();
    };

    const handleDelete = async (itemId) => {
        if (confirm('Are you sure you want to delete this record?')) {
            await deleteAttendance(itemId);
            await loadData();
        }
    };

    if (!child) return <div className="p-4">Loading child...</div>;

    return (
        <main>
            <header style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        marginBottom: '1rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit'
                    }}
                >
                    <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Back
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>{child.name}</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>£{child.rate}/hr</p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>{totalHoursAllTime}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Hours</span>
                    </div>
                </div>
            </header>

            {/* Analytics Chart */}
            <section className="card">
                <h3>This Month</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Y-axis labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '150px', paddingBottom: '5px', fontSize: '0.65rem', color: 'var(--text-secondary)', minWidth: '20px', textAlign: 'right', paddingRight: '0.25rem' }}>
                        <span>{chartMax}h</span>
                        <span>{Math.round(chartMax * 0.66)}h</span>
                        <span>{Math.round(chartMax * 0.33)}h</span>
                        <span>0h</span>
                    </div>
                    {/* Chart bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '4px', overflowX: 'auto', paddingBottom: '5px', flex: 1 }}>
                        {monthlyData.map((val, idx) => {
                            const height = (val / chartMax) * 100; // Dynamic scaling based on chartMax
                            const isOvertime = val > 8;
                            return (
                                                            <div key={idx} style={{ flex: 1, minWidth: '10px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                                <div style={{
                                                                    width: '100%',
                                                                    height: `${height}%`,                                        background: isOvertime ? 'var(--primary-blue)' : 'var(--primary-green)',
                                        borderRadius: '4px 4px 0 0',
                                        minHeight: val > 0 ? '8px' : '0'
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '24px' }}>
                    <span>1st</span>
                    <span>15th</span>
                    <span>End</span>
                </div>
            </section>

            {/* History List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Attendance History</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--primary-blue)',
                        background: 'transparent',
                        color: 'var(--primary-blue)',
                        cursor: 'pointer',
                        fontWeight: 500,
                    }}
                >
                    <Plus size={18} />
                    Add Record
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => {
                    const isEditing = editingId === item.id;
                    const hours = getRecordHours(item);
                    const dateStr = item.date
                        ? new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                        : new Date(item.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                    return (
                        <div key={item.id} className="card" style={{ marginBottom: 0, padding: '1rem' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {item.hours !== undefined ? (
                                        // Hours-based edit
                                        <>
                                            <label style={{ fontSize: '0.875rem' }}>Date</label>
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                            />
                                            <label style={{ fontSize: '0.875rem' }}>Hours</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                value={editForm.hours}
                                                onChange={e => setEditForm({ ...editForm, hours: parseFloat(e.target.value) || 0 })}
                                                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                            />
                                        </>
                                    ) : (
                                        // Time-based edit (legacy)
                                        <>
                                            <label style={{ fontSize: '0.875rem' }}>Start</label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.start}
                                                onChange={e => setEditForm({ ...editForm, start: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                            />
                                            <label style={{ fontSize: '0.875rem' }}>End</label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.end}
                                                onChange={e => setEditForm({ ...editForm, end: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                            />
                                        </>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button onClick={() => saveEdit(item)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', background: 'var(--primary-green)', color: 'white', fontWeight: 500 }}>Save</button>
                                        <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '0.5rem', background: 'var(--border-color)', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{dateStr}</h4>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {item.hours !== undefined ? (
                                                `${item.hours} hours`
                                            ) : (
                                                <>
                                                    {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                    {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{hours.toFixed(1)}h</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => startEdit(item)} style={{ color: 'var(--text-secondary)', padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                {history.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No history found.</p>}
            </div>

            {/* Manual Entry Modal */}
            <ManualEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleManualSave}
                existingDates={history.filter(h => h.date).map(h => h.date)}
            />
        </main>
    );
}
