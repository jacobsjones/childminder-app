'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, List, XCircle, Clock, Plus } from 'lucide-react';
import HoursLogModal from '@/components/HoursLogModal';

const EMOJI = ['🐻', '🦊', '🐸', '🐥', '🐙', '🦔', '🐝', '⭐'];

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function Dashboard() {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState({ isOpen: false, childId: null, childName: '', initialHours: 0 });

    const loadData = useCallback(async () => {
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();

            const enrichedChildren = (data.children || []).map((c) => {
                const sum = nameHash(c.name);
                return {
                    ...c,
                    icon: EMOJI[sum % EMOJI.length],
                    blob: `blob-${sum % 4}`,
                };
            });

            setChildren(enrichedChildren);
            setLoading(false);
        } catch (error) {
            console.error('[Dashboard] Failed to load data:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        const handleReload = () => {
            console.log('[Dashboard] Reloading data after AI action...');
            loadData();
        };

        window.addEventListener('reloadDashboardData', handleReload);

        return () => {
            window.removeEventListener('reloadDashboardData', handleReload);
        };
    }, [loadData]);

    const handleLogHours = async (childId, childName) => {
        const child = children.find(c => c.id === childId);
        const todayHours = child?.todayRecord?.hours || 0;

        setModalState({
            isOpen: true,
            childId,
            childName,
            initialHours: todayHours
        });
    };

    const handleSaveHours = async (hours) => {
        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'logHours',
                    childId: modalState.childId,
                    hours: hours
                })
            });

            if (response.ok) {
                await loadData();
            }
        } catch (error) {
            console.error('Failed to log hours:', error);
        }
    };

    const handleDeleteRecord = async (recordId) => {
        if (confirm('Mark as absent? This will remove today\'s hours.')) {
            try {
                const response = await fetch('/api/attendance', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: recordId })
                });

                if (response.ok) {
                    await loadData();
                }
            } catch (error) {
                console.error('Failed to delete attendance:', error);
            }
        }
    };

    const getChildStatus = (childId) => {
        const child = children.find(c => c.id === childId);
        const record = child?.todayRecord;

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

    const loggedTodayCount = children.filter(c => c.todayRecord).length;
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Hey Sue! ☀️</h1>
                <p className="page-sub">
                    {today}
                    {!loading && children.length > 0 && (
                        <> · {loggedTodayCount === 0
                            ? 'no hours logged yet'
                            : `${loggedTodayCount} little ${loggedTodayCount === 1 ? 'one' : 'ones'} logged today`}
                        </>
                    )}
                </p>
            </header>

            {loading ? (
                <DashboardSkeleton />
            ) : (
                <DashboardList
                    childrenData={children}
                    getChildStatus={getChildStatus}
                    onLogHours={handleLogHours}
                    onDeleteRecord={handleDeleteRecord}
                />
            )}

            <HoursLogModal
                key={`${modalState.childId}-${modalState.isOpen}`}
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                childName={modalState.childName}
                initialHours={modalState.initialHours}
                onSave={handleSaveHours}
            />
        </main>
    );
}

function DashboardSkeleton() {
    return (
        <section className="card" aria-busy="true" aria-label="Loading children">
            <div className="stack">
                {[0, 1, 2].map(i => (
                    <div key={i} className="row" style={{ padding: '0.75rem 0' }}>
                        <div className="avatar" style={{ background: 'var(--surface-2)', borderRadius: '50%' }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ height: '0.9rem', width: '40%', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)', marginBottom: '0.5rem' }} />
                            <div style={{ height: '0.7rem', width: '25%', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)' }} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function DashboardList({ childrenData, getChildStatus, onLogHours, onDeleteRecord }) {
    const [viewMode, setViewMode] = useState('list');
    const router = useRouter();

    useEffect(() => {
        const savedView = localStorage.getItem('dashboard_view_mode');
        if (savedView) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setViewMode(savedView);
        }
    }, []);

    const handleSetViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('dashboard_view_mode', mode);
    };

    const sortedData = childrenData.map(c => {
        const status = getChildStatus(c.id);
        return {
            ...c,
            todayStatus: status
        };
    }).sort((a, b) => {
        if (a.todayStatus.hasHours && !b.todayStatus.hasHours) return -1;
        if (!a.todayStatus.hasHours && b.todayStatus.hasHours) return 1;
        return a.name.localeCompare(b.name);
    });

    const handleCardClick = (e, childId) => {
        if (e.target.closest('button')) return;
        router.push(`/children/${childId}`);
    };

    if (childrenData.length === 0) {
        return (
            <section className="card empty-state">
                <span className="empty-emoji" aria-hidden="true">🌱</span>
                <h2 style={{ color: 'var(--ink)' }}>No little ones yet</h2>
                <p style={{ margin: '0 auto 1.25rem' }}>Add your first child and their hours will show up here each day.</p>
                <Link href="/children" className="btn btn-primary">
                    <Plus size={18} /> Add a child
                </Link>
            </section>
        );
    }

    return (
        <section className="card">
            <div className="row-between" style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Today</h2>
                <div className="seg seg-icon" role="group" aria-label="View mode">
                    <button
                        onClick={() => handleSetViewMode('list')}
                        className={`seg-btn ${viewMode === 'list' ? 'active' : ''}`}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => handleSetViewMode('grid')}
                        className={`seg-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        aria-label="Grid view"
                        aria-pressed={viewMode === 'grid'}
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            <div style={viewMode === 'grid' ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem',
                width: '100%'
            } : { display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedData.map((child) => {
                    const done = child.todayStatus.hasHours;
                    const isGrid = viewMode === 'grid';

                    return (
                        <div
                            key={child.id}
                            onClick={(e) => handleCardClick(e, child.id)}
                            className="card-tap"
                            style={{
                                background: isGrid ? 'var(--surface-2)' : 'transparent',
                                border: isGrid ? 'none' : '1px solid var(--line)',
                                borderRadius: 'var(--r-lg)',
                                padding: isGrid ? '1rem 0.75rem' : '0.9rem 1rem',
                                display: 'flex',
                                flexDirection: isGrid ? 'column' : 'row',
                                alignItems: 'center',
                                gap: isGrid ? '0.5rem' : '0.9rem',
                                textAlign: isGrid ? 'center' : 'left',
                                width: '100%',
                                minWidth: 0,
                                overflow: 'hidden'
                            }}
                        >
                            <div className={`avatar ${child.blob}`} aria-hidden="true">
                                {child.icon}
                            </div>

                            <div style={{ flex: isGrid ? 'none' : 1, minWidth: 0, width: isGrid ? '100%' : 'auto' }}>
                                <h3 style={{ margin: 0, fontSize: isGrid ? '1rem' : '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {child.name}
                                </h3>
                                <div style={{ marginTop: '0.25rem' }}>
                                    {done ? (
                                        <span className="chip chip-leaf">✓ {child.todayStatus.hours}h today</span>
                                    ) : (
                                        <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                                            {child.totalHours.toFixed(1)}h total
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="row" style={{ gap: '0.4rem', width: isGrid ? '100%' : 'auto', justifyContent: 'center', flexShrink: 0 }}>
                                {done ? (
                                    <>
                                        <button
                                            onClick={() => onLogHours(child.id, child.name)}
                                            className={`btn btn-sky ${isGrid ? '' : 'btn-icon'}`}
                                            style={isGrid ? { flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' } : {}}
                                            title="Edit hours"
                                            aria-label={`Edit hours for ${child.name}`}
                                        >
                                            <Clock size={isGrid ? 15 : 19} />
                                            {isGrid && 'Edit'}
                                        </button>
                                        {child.todayStatus.isAuto && (
                                            <button
                                                onClick={() => onDeleteRecord(child.todayStatus.record.id)}
                                                className={`btn btn-danger-soft ${isGrid ? '' : 'btn-icon'}`}
                                                style={isGrid ? { flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' } : {}}
                                                title="Mark absent"
                                                aria-label={`Mark ${child.name} absent`}
                                            >
                                                <XCircle size={isGrid ? 15 : 19} />
                                                {isGrid && 'Absent'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => onLogHours(child.id, child.name)}
                                        className={`btn btn-primary wiggle-on-hover ${isGrid ? '' : 'btn-icon'}`}
                                        style={isGrid ? { width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem' } : {}}
                                        title="Log hours"
                                        aria-label={`Log hours for ${child.name}`}
                                    >
                                        <Clock size={isGrid ? 15 : 19} />
                                        {isGrid && 'Log hours'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
