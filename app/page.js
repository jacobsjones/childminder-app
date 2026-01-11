'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Banknote, LayoutGrid, List, Settings, Calendar, XCircle, Clock } from 'lucide-react';
import { getChildren, getAttendance, getTotalHoursForChild, processScheduledAttendance, deleteAttendance, getTodayHours, logHours } from '@/lib/store';
import HoursLogModal from '@/components/HoursLogModal';

export default function Dashboard() {
    const [children, setChildren] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState({ isOpen: false, childId: null, childName: '', initialHours: 0 });

    const loadData = useCallback(async () => {
        // First, sync data from server
        try {
            const response = await fetch('/api/sync');
            if (response.ok) {
                const serverData = await response.json();

                // Merge server data into localStorage
                if (serverData.children && serverData.children.length > 0) {
                    localStorage.setItem('childminder_children', JSON.stringify(serverData.children));
                }
                if (serverData.attendance && serverData.attendance.length > 0) {
                    localStorage.setItem('childminder_attendance', JSON.stringify(serverData.attendance));
                }
            }
        } catch (error) {
            console.error('[Dashboard] Failed to sync from server:', error);
        }

        // Then load from localStorage
        setChildren(getChildren());
        setAttendance(getAttendance());
        setLoading(false);
    }, []);

    useEffect(() => {
        // Run auto-scheduler logic on load
        processScheduledAttendance();
        const timer = setTimeout(() => loadData(), 0);

        // Listen for AI assistant updates
        const handleReload = () => {
            console.log('[Dashboard] Reloading data after AI action...');
            loadData();
        };

        window.addEventListener('reloadDashboardData', handleReload);

        return () => {
            window.removeEventListener('reloadDashboardData', handleReload);
            clearTimeout(timer);
        };
    }, [loadData]);

    const handleLogHours = (childId, childName) => {
        const todayHours = getTodayHours(childId) || 0;
        setModalState({
            isOpen: true,
            childId,
            childName,
            initialHours: todayHours
        });
    };

    const handleSaveHours = (hours) => {
        logHours(modalState.childId, hours);
        loadData();
    };

    const handleDeleteRecord = (recordId) => {
        if (confirm('Mark as absent? This will remove today\'s hours.')) {
            deleteAttendance(recordId);
            loadData();
        }
    };

    if (loading) return <div>Loading...</div>;

    // Get child status based on hours logged today
    const getChildStatus = (childId) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        // Find record for today
        const record = attendance.find(a => a.childId === childId && a.date === todayStr);

        if (record) {
            return {
                hasHours: true,
                hours: record.hours,
                isAuto: record.isAuto,
                record
            };
        }
        return { hasHours: false, hours: 0, isAuto: false, record: null };
    };

    const activeCount = children.filter(c => {
        const s = getChildStatus(c.id);
        return s.hasHours;
    }).length;

    return (
        <main>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Hey Sue! ☀️</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        You have {activeCount} children logged today.
                    </p>
                </div>
            </header>

            <DashboardList
                childrenData={children}
                getChildStatus={getChildStatus}
                onLogHours={handleLogHours}
                onDeleteRecord={handleDeleteRecord}
            />

            <HoursLogModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                childName={modalState.childName}
                initialHours={modalState.initialHours}
                onSave={handleSaveHours}
            />
        </main>
    );
}

function DashboardList({ childrenData, getChildStatus, onLogHours, onDeleteRecord }) {
    const [viewMode, setViewMode] = useState('list');
    const router = useRouter();

    useEffect(() => {
        // Load view preference
        const savedView = localStorage.getItem('dashboard_view_mode');
        if (savedView) {
            setViewMode(savedView);
        }
    }, []);

    const handleSetViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('dashboard_view_mode', mode);
    };

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
            todayStatus: status,
            icon: getIcon(c.name)
        };
    }).sort((a, b) => {
        // Sort: logged today first, then by name
        if (a.todayStatus.hasHours && !b.todayStatus.hasHours) return -1;
        if (!a.todayStatus.hasHours && b.todayStatus.hasHours) return 1;
        return a.name.localeCompare(b.name);
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
                        onClick={() => handleSetViewMode('list')}
                        style={{ padding: '0.4rem', borderRadius: '0.3rem', background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <List size={20} color="var(--text-color)" />
                    </button>
                    <button
                        onClick={() => handleSetViewMode('grid')}
                        style={{ padding: '0.4rem', borderRadius: '0.3rem', background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <LayoutGrid size={20} color="var(--text-color)" />
                    </button>
                </div>
            </div>

            {childrenData.length === 0 ? (
                <p className="status-inactive">No children added yet.</p>
            ) : (
                <div style={viewMode === 'grid' ? { 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '0.75rem',
                    width: '100%'
                } : { display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sortedData.map((child) => (
                        <div
                            key={child.id}
                            onClick={(e) => handleCardClick(e, child.id)}
                            style={{
                                cursor: 'pointer',
                                background: viewMode === 'grid' ? 'var(--bg-color)' : 'transparent',
                                border: viewMode === 'grid' ? 'none' : '1px solid var(--border-color)',
                                borderRadius: '1rem',
                                padding: viewMode === 'grid' ? '0.75rem 0.5rem' : '1rem',
                                display: 'flex',
                                flexDirection: viewMode === 'grid' ? 'column' : 'row',
                                alignItems: 'center',
                                justifyContent: viewMode === 'grid' ? 'center' : 'flex-start',
                                gap: viewMode === 'grid' ? '0.25rem' : '1rem',
                                textAlign: viewMode === 'grid' ? 'center' : 'left',
                                transition: 'transform 0.1s',
                                width: '100%',
                                minWidth: 0,
                                aspectRatio: viewMode === 'grid' ? '1 / 1' : 'auto',
                                overflow: 'hidden'
                            }}
                            className={viewMode === 'grid' ? '' : 'list-item'}
                        >
                            {/* Icon */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                    width: viewMode === 'grid' ? '2.75rem' : '3.5rem',
                                    height: viewMode === 'grid' ? '2.75rem' : '3.5rem',
                                    background: 'var(--bg-card)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: viewMode === 'grid' ? '1.5rem' : '2rem',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    border: '1px solid var(--border-color)',
                                    flexShrink: 0
                                }}>
                                    {child.icon}
                                </div>
                                {child.schedule?.enabled && (
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-card)', borderRadius: '50%', padding: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                        <Calendar size={12} color="var(--primary-blue-text)" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                <h3 style={{ marginBottom: '0.1rem', fontSize: viewMode === 'grid' ? '0.9rem' : '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.name}</h3>
                                <div style={{ fontSize: viewMode === 'grid' ? '0.7rem' : '0.85rem', color: 'var(--text-secondary)' }}>
                                    {child.todayStatus.hasHours ? (
                                        <span style={{ color: 'var(--primary-green)', fontWeight: 600 }}>
                                            {child.todayStatus.hours}h today
                                        </span>
                                    ) : (
                                        <span>{child.totalHours.toFixed(1)}h total</span>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexDirection: viewMode === 'grid' ? 'column' : 'row', width: viewMode === 'grid' ? '100%' : 'auto', justifyContent: 'center', flexShrink: 0 }}>
                                {child.todayStatus.hasHours ? (
                                    <>
                                        <button
                                            onClick={() => onLogHours(child.id, child.name)}
                                            style={{
                                                padding: viewMode === 'grid' ? '0.4rem 0.5rem' : '0.6rem',
                                                borderRadius: viewMode === 'grid' ? '9999px' : '50%',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                background: 'transparent',
                                                color: 'var(--primary-blue-text)',
                                                border: `2px solid var(--primary-blue)`,
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                justifyContent: 'center',
                                                aspectRatio: viewMode === 'grid' ? 'auto' : '1/1'
                                            }}
                                            title="Edit Hours"
                                        >
                                            <Clock size={viewMode === 'grid' ? 14 : 20} />
                                            {viewMode === 'grid' && 'Edit'}
                                        </button>
                                        {child.todayStatus.isAuto && (
                                            <button
                                                onClick={() => onDeleteRecord(child.todayStatus.record.id)}
                                                style={{
                                                    padding: viewMode === 'grid' ? '0.4rem 0.5rem' : '0.6rem',
                                                    background: 'transparent',
                                                    borderRadius: viewMode === 'grid' ? '0.5rem' : '50%',
                                                    color: '#dc2626',
                                                    border: '2px solid #dc2626',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    whiteSpace: 'nowrap',
                                                    aspectRatio: viewMode === 'grid' ? 'auto' : '1/1'
                                                }}
                                                title="Mark Absent"
                                            >
                                                <XCircle size={viewMode === 'grid' ? 14 : 20} />
                                                {viewMode === 'grid' && 'Abs'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => onLogHours(child.id, child.name)}
                                        style={{
                                            padding: viewMode === 'grid' ? '0.4rem 0.5rem' : '0.6rem',
                                            borderRadius: viewMode === 'grid' ? '9999px' : '50%',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            background: 'var(--primary-blue)',
                                            color: 'white',
                                            border: `2px solid var(--primary-blue)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            justifyContent: 'center',
                                            aspectRatio: viewMode === 'grid' ? 'auto' : '1/1',
                                            width: viewMode === 'grid' ? '100%' : 'auto'
                                        }}
                                        title="Log Hours"
                                    >
                                        <Clock size={viewMode === 'grid' ? 14 : 20} />
                                        {viewMode === 'grid' && 'Log Hours'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
