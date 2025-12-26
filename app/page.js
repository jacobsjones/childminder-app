'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Banknote, LayoutGrid, List, Settings, Calendar, XCircle } from 'lucide-react';
import { getChildren, getAttendance, getActiveCheckIn, checkIn, checkOut, getTotalHoursForChild, processScheduledAttendance, deleteAttendance } from '@/lib/store';

export default function Dashboard() {
    const [children, setChildren] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Run auto-scheduler logic on load
        processScheduledAttendance();
        loadData();
    }, []);

    const loadData = () => {
        setChildren(getChildren());
        setAttendance(getAttendance());
        setLoading(false);
    };

    const handleToggleStatus = (id, isActive) => {
        if (isActive) {
            checkOut(id);
        } else {
            checkIn(id);
        }
        loadData();
    };

    const handleDeleteRecord = (recordId) => {
        if (confirm('Mark as absent? This will remove the scheduled hours.')) {
            deleteAttendance(recordId);
            loadData();
        }
    };

    if (loading) return <div>Loading...</div>;

    // A child is "active" if checked in manually OR has a scheduled record for today
    const getChildStatus = (childId) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        // Find record for today
        const record = attendance.find(a => a.childId === childId && a.startTime.startsWith(todayStr));

        if (record) {
            if (record.isAuto) return { type: 'scheduled', record };
            if (!record.endTime) return { type: 'checked-in', record }; // Manual Check-in
            return { type: 'checked-out', record }; // Manually finished
        }
        return { type: 'none', record: null };
    };

    const activeCount = children.filter(c => {
        const s = getChildStatus(c.id);
        return s.type === 'checked-in' || s.type === 'scheduled';
    }).length;

    return (
        <main>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Good Morning! ☀️</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        You have {activeCount} children expected.
                    </p>
                </div>
            </header>

            <DashboardList
                childrenData={children}
                onToggleStatus={handleToggleStatus}
                getChildStatus={getChildStatus}
                onDeleteRecord={handleDeleteRecord}
            />
        </main>
    );
}

function DashboardList({ childrenData, onToggleStatus, getChildStatus, onDeleteRecord }) {
    const [viewMode, setViewMode] = useState('list');
    const router = useRouter();

    // deterministic icon based on name char code sum
    const getIcon = (name) => {
        const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const icons = ['🐻', '☀️', '⭐'];
        return icons[sum % icons.length];
    };

    const sortedData = childrenData.map(c => {
        const status = getChildStatus(c.id);
        return {
            ...c,
            totalHours: getTotalHoursForChild(c.id),
            status: status.type, // 'scheduled', 'checked-in', 'checked-out', 'none'
            record: status.record,
            icon: getIcon(c.name)
        };
    }).sort((a, b) => {
        const priority = { 'scheduled': 3, 'checked-in': 2, 'checked-out': 1, 'none': 0 };
        return priority[b.status] - priority[a.status];
    });

    const handleCardClick = (e, childId) => {
        // Prevent navigation if button was clicked
        if (e.target.closest('button')) return;
        router.push(`/children/${childId}`);
    };

    return (
        <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Children</h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '0.4rem', borderRadius: '0.3rem', background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <List size={20} color="var(--text-color)" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{ padding: '0.4rem', borderRadius: '0.3rem', background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <LayoutGrid size={20} color="var(--text-color)" />
                    </button>
                </div>
            </div>

            {childrenData.length === 0 ? (
                <p className="status-inactive">No children added yet.</p>
            ) : (
                <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sortedData.map((child) => (
                        <div
                            key={child.id}
                            onClick={(e) => handleCardClick(e, child.id)}
                            style={{
                                cursor: 'pointer',
                                background: viewMode === 'grid' ? 'var(--bg-color)' : 'transparent',
                                border: viewMode === 'grid' ? 'none' : '1px solid var(--border-color)',
                                borderRadius: '1rem',
                                padding: viewMode === 'grid' ? '1.5rem' : '1rem',
                                display: 'flex',
                                flexDirection: viewMode === 'grid' ? 'column' : 'row',
                                alignItems: 'center',
                                gap: '1rem',
                                textAlign: viewMode === 'grid' ? 'center' : 'left',
                                transition: 'transform 0.1s'
                            }}
                            className={viewMode === 'grid' ? '' : 'list-item'}
                        >
                            {/* Icon */}
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '3.5rem',
                                    height: '3.5rem',
                                    background: 'var(--bg-card)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    border: '1px solid var(--border-color)',
                                    flexShrink: 0
                                }}>
                                    {child.icon}
                                </div>
                                {child.schedule?.enabled && (
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-card)', borderRadius: '50%', padding: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                        <Calendar size={14} color="var(--primary-blue-text)" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem' }}>{child.name}</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {child.status === 'scheduled' ? (
                                        <span style={{ color: 'var(--primary-blue-text)', fontWeight: 600 }}>
                                            Scheduled: {child.record.startTime.slice(11, 16)} - {child.record.endTime.slice(11, 16)}
                                        </span>
                                    ) : (
                                        <span>{child.totalHours.toFixed(1)} hrs this month</span>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            {child.schedule?.enabled ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: viewMode === 'grid' ? 'column' : 'row', width: viewMode === 'grid' ? '100%' : 'auto' }}>
                                    {child.status === 'scheduled' && child.record ? (
                                        <button
                                            onClick={() => onDeleteRecord(child.record.id)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                background: 'transparent',
                                                borderRadius: '0.5rem',
                                                color: '#dc2626',
                                                border: '2px solid #dc2626',
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <XCircle size={18} />
                                            Mark as Absent
                                        </button>
                                    ) : (
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            background: 'var(--bg-color)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                            fontSize: '0.85rem',
                                            textAlign: 'center'
                                        }}>
                                            Not scheduled today
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => onToggleStatus(child.id, child.status === 'checked-in')}
                                    style={{
                                        width: viewMode === 'grid' ? '100%' : 'auto',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '9999px',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        background: child.status === 'checked-in' ? 'transparent' : 'var(--primary-blue)',
                                        color: child.status === 'checked-in' ? 'var(--primary-blue-text)' : 'var(--primary-blue-text)',
                                        border: `2px solid var(--primary-blue)`,
                                        marginTop: viewMode === 'grid' ? '0.5rem' : '0'
                                    }}
                                >
                                    {child.status === 'checked-in' ? 'Check Out' : 'Check In'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
