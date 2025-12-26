'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Save, Trash, X } from 'lucide-react';
import { getChild, getAttendance, updateAttendance, deleteAttendance } from '@/lib/store';

export default function ChildProfile({ params }) {
    // Unwrap params using React.use()
    const { id } = use(params);
    const router = useRouter();

    const [child, setChild] = useState(null);
    const [history, setHistory] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ start: '', end: '' });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = () => {
        setChild(getChild(id));
        const allAttendance = getAttendance();
        const childHistory = allAttendance
            .filter(a => a.childId === id && a.endTime)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        setHistory(childHistory);
    };

    const calculateHours = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(0, (e - s) / (1000 * 60 * 60)).toFixed(2);
    };

    const totalHoursAllTime = history.reduce((sum, item) => sum + parseFloat(calculateHours(item.startTime, item.endTime)), 0).toFixed(1);

    // --- Analytics Data ---
    const getMonthlyData = () => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const data = Array(daysInMonth).fill(0);

        history.forEach(item => {
            const itemDate = new Date(item.startTime);
            if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
                const day = itemDate.getDate() - 1; // 0-indexed
                data[day] += parseFloat(calculateHours(item.startTime, item.endTime));
            }
        });
        return data;
    };

    const monthlyData = getMonthlyData();

    // --- Editing Handlers ---
    const startEdit = (item) => {
        setEditingId(item.id);
        // Format for datetime-local input matches: YYYY-MM-DDTHH:mm
        const toLocal = (d) => new Date(d).toISOString().slice(0, 16);
        setEditForm({
            start: toLocal(item.startTime),
            end: toLocal(item.endTime)
        });
    };

    const saveEdit = (originalItem) => {
        const updated = {
            ...originalItem,
            startTime: new Date(editForm.start).toISOString(),
            endTime: new Date(editForm.end).toISOString()
        };
        updateAttendance(updated);
        setEditingId(null);
        loadData();
    };

    const handleDelete = (itemId) => {
        if (confirm('Are you sure you want to delete this record?')) {
            deleteAttendance(itemId);
            loadData();
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
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '4px', overflowX: 'auto', paddingBottom: '5px' }}>
                    {monthlyData.map((val, idx) => {
                        const height = Math.min(val * 10, 100); // Scale: 10px per hour, max 100%
                        const isOvertime = val > 8;
                        return (
                            <div key={idx} style={{ flex: 1, minWidth: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '100%',
                                    height: `${height}%`,
                                    background: isOvertime ? 'var(--primary-blue)' : 'var(--primary-green)',
                                    borderRadius: '4px 4px 0 0',
                                    minHeight: val > 0 ? '4px' : '0'
                                }} />
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>1st</span>
                    <span>15th</span>
                    <span>End</span>
                </div>
            </section>

            {/* History List */}
            <h3>Attendance History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => {
                    const isEditing = editingId === item.id;
                    const hours = calculateHours(item.startTime, item.endTime);
                    const dateStr = new Date(item.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                    return (
                        <div key={item.id} className="card" style={{ marginBottom: 0, padding: '1rem' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem' }}>Start</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.start}
                                        onChange={e => setEditForm({ ...editForm, start: e.target.value })}
                                    />
                                    <label style={{ fontSize: '0.875rem' }}>End</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.end}
                                        onChange={e => setEditForm({ ...editForm, end: e.target.value })}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button onClick={() => saveEdit(item)} className="bg-green" style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Save</button>
                                        <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '0.5rem', background: 'var(--border-color)', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{dateStr}</h4>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{hours}h</div>
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
        </main>
    );
}
