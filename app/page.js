'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import HoursLogModal from '@/components/HoursLogModal';

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const STAGGER = [36, 52, 28, 44];

// Stem grows with the day's hours: ~6px per hour
const stemHeight = (hours) => Math.max(10, Math.min(10 + hours * 6, 64));

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
                    shape: `shape-${sum % 4}`,
                };
            });

            setChildren(enrichedChildren);
            setLoading(false);
        } catch (error) {
            console.error('[Dashboard] Failed to load data:', error);
            setLoading(false);
        }
    }, []);

    // Lock the homepage to one screen — no vertical scrolling
    useEffect(() => {
        document.body.classList.add('scene-locked');
        return () => document.body.classList.remove('scene-locked');
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

    const handleLogHours = (childId, childName) => {
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

    const loggedTodayCount = children.filter(c => c.todayRecord).length;
    const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

    return (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <header style={{ marginBottom: '0.5rem' }}>
                <div className="sun-blob" aria-hidden="true">
                    <Sun size={26} strokeWidth={2.2} />
                </div>
                <h1 style={{ margin: '1rem 0 0.15rem' }}>Hey Sue!</h1>
                <p className="page-sub" style={{ marginTop: 0 }}>
                    {weekday}
                    {!loading && children.length > 0 && (
                        <> · {loggedTodayCount} of {children.length} logged</>
                    )}
                </p>
            </header>

            <Sky />

            <section style={{ marginTop: 'auto' }}>
                {loading ? (
                    <GardenDock>
                        <GardenSkeletonStrip />
                    </GardenDock>
                ) : children.length === 0 ? (
                    <GardenDock>
                        <EmptyGardenStrip />
                    </GardenDock>
                ) : (
                    <Garden
                        childrenData={children}
                        onLogHours={handleLogHours}
                        onDeleteRecord={handleDeleteRecord}
                    />
                )}
            </section>

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

function Sky() {
    return (
        <div className="sky" aria-hidden="true">
            <div className="cloud" style={{ top: '12%', left: '8%', width: '72px', animationDuration: '7s' }} />
            <div className="cloud" style={{ top: '48%', left: '58%', width: '96px', animationDuration: '11s' }} />
            <div className="cloud" style={{ top: '20%', left: '78%', width: '58px', animationDuration: '9s' }} />
        </div>
    );
}

function GardenDock({ children }) {
    return (
        <div className="garden-dock">
            <div className="hills-bg">
                <svg aria-hidden="true">
                    <defs>
                        <pattern id="garden-hills" width="300" height="115" patternUnits="userSpaceOnUse">
                            <path className="hill-back" d="M0,48 C50,30 95,64 150,44 C205,26 255,62 300,48 L300,115 L0,115 Z" />
                            <path className="hill-front" d="M0,86 C80,64 200,102 300,86 L300,115 L0,115 Z" />
                        </pattern>
                    </defs>
                    <rect x="0" y="0" width="100%" height="115" fill="url(#garden-hills)" />
                </svg>
            </div>
            {children}
        </div>
    );
}

function GardenSkeletonStrip() {
    return (
        <div className="garden-scroll" aria-busy="true" aria-label="Loading the garden">
            <div className="garden-strip">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="sprout-slot" style={{ paddingBottom: `${STAGGER[i]}px` }}>
                        <div className={`sprout-blob dormant shape-${i}`} style={{ borderStyle: 'solid', borderColor: 'var(--line)' }} />
                        <div style={{ height: '0.8rem', width: '3.5rem', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyGardenStrip() {
    return (
        <div className="garden-scroll">
            <div className="garden-strip">
                <div className="sprout-slot" style={{ paddingBottom: '52px' }}>
                    <Link
                        href="/children"
                        className="sprout-blob dormant shape-0"
                        style={{ textDecoration: 'none', color: 'var(--leaf-deep)' }}
                        aria-label="Add your first child"
                    >
                        <Plus size={26} />
                    </Link>
                    <span className="sprout-name">Plant your first child</span>
                    <span className="sprout-meta">their days will grow here</span>
                    <div className="sprout-stem stem-dormant" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

function Garden({ childrenData, onLogHours, onDeleteRecord }) {
    const router = useRouter();
    const scrollRef = useRef(null);

    const sorted = [...childrenData].sort((a, b) => a.name.localeCompare(b.name));
    const canScroll = sorted.length > 3;

    const scrollBy = (dir) => {
        const el = scrollRef.current;
        if (el) {
            el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
        }
    };

    return (
        <>
            {canScroll && (
                <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                    <span className="sprout-meta" aria-hidden="true">Swipe to wander the garden →</span>
                    <div className="garden-nav">
                        <button className="btn btn-soft btn-icon" style={{ width: '38px', height: '38px' }} onClick={() => scrollBy(-1)} aria-label="Scroll garden left">
                            <ChevronLeft size={19} />
                        </button>
                        <button className="btn btn-soft btn-icon" style={{ width: '38px', height: '38px' }} onClick={() => scrollBy(1)} aria-label="Scroll garden right">
                            <ChevronRight size={19} />
                        </button>
                    </div>
                </div>
            )}

            <GardenDock>
                <div className="garden-scroll" ref={scrollRef}>
                    <div className="garden-strip">
                        {sorted.map((child, i) => {
                            const record = child.todayRecord;
                            const grown = !!record;
                            const isAuto = grown && record.isAuto;

                            return (
                                <div
                                    key={child.id}
                                    className="sprout-slot"
                                    style={{ paddingBottom: `${STAGGER[i % STAGGER.length]}px` }}
                                >
                                    <div className="sprout-chips">
                                        {grown ? (
                                            <>
                                                <button
                                                    className={`chip chip-btn ${isAuto ? 'chip-sky' : 'chip-leaf'}`}
                                                    onClick={() => onLogHours(child.id, child.name)}
                                                    title="Edit today's hours"
                                                    aria-label={`Edit today's hours for ${child.name} — currently ${record.hours} hours`}
                                                >
                                                    {record.hours}h {isAuto ? 'auto' : '✓'}
                                                </button>
                                                {isAuto && (
                                                    <button
                                                        className="chip chip-btn chip-berry"
                                                        onClick={() => onDeleteRecord(record.id)}
                                                        title="Mark absent"
                                                        aria-label={`Mark ${child.name} absent today`}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                className="chip chip-btn chip-dashed"
                                                onClick={() => onLogHours(child.id, child.name)}
                                                title="Log today's hours"
                                                aria-label={`Log today's hours for ${child.name}`}
                                            >
                                                + log
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        className={`sprout-blob ${child.shape} ${grown ? (isAuto ? 'grown-auto' : 'grown-manual') : 'dormant'}`}
                                        onClick={() => router.push(`/children/${child.id}`)}
                                        aria-label={`Open ${child.name}'s profile`}
                                    >
                                        <span aria-hidden="true">{child.name.charAt(0).toUpperCase()}</span>
                                    </button>

                                    <span className="sprout-name">{child.name}</span>
                                    {!grown && (
                                        <span className="sprout-meta">{child.totalHours.toFixed(1)}h total</span>
                                    )}

                                    <div
                                        className={`sprout-stem ${grown ? 'stem-grown' : 'stem-dormant'}`}
                                        style={grown ? { height: `${stemHeight(record.hours)}px` } : undefined}
                                        aria-hidden="true"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </GardenDock>
        </>
    );
}
