'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import HoursLogModal from '@/components/HoursLogModal';

const EMOJI = ['🐻', '🦊', '🐸', '🐥', '🐙', '🦔', '🐝', '⭐'];

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const SLOTS = {
    1: { lefts: [50], bottoms: [58] },
    2: { lefts: [30, 70], bottoms: [58, 40] },
    3: { lefts: [18, 50, 82], bottoms: [48, 74, 36] },
};

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
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <main>
            <header className="row" style={{ gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="sun-blob" aria-hidden="true">☀️</div>
                <div>
                    <h1 style={{ marginBottom: '0.15rem' }}>Hey Sue!</h1>
                    <p className="page-sub" style={{ marginTop: 0 }}>
                        {today}
                        {!loading && children.length > 0 && (
                            <> · {loggedTodayCount === 0
                                ? 'the garden is waiting'
                                : `${loggedTodayCount} of ${children.length} growing today`}
                            </>
                        )}
                    </p>
                </div>
            </header>

            {loading ? (
                <GardenSkeleton />
            ) : children.length === 0 ? (
                <EmptyGarden />
            ) : (
                <Garden
                    childrenData={children}
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

function Hills({ flipped }) {
    return (
        <svg
            className="hills"
            viewBox="0 0 300 115"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={flipped ? { transform: 'scaleX(-1)' } : undefined}
        >
            <path className="hill-back" d="M0,58 C60,38 120,66 180,48 C230,34 270,50 300,40 L300,115 L0,115 Z" />
            <path className="hill-front" d="M0,88 C80,68 180,98 300,74 L300,115 L0,115 Z" />
        </svg>
    );
}

function GardenSkeleton() {
    return (
        <div className="garden" aria-busy="true" aria-label="Loading the garden">
            <div className="garden-row">
                <Hills flipped={false} />
                {[18, 50, 82].map((left, i) => (
                    <div key={i} className="sprout" style={{ left: `${left}%`, bottom: `${[48, 74, 36][i]}px` }}>
                        <div className={`sprout-blob dormant shape-${i}`} style={{ borderStyle: 'solid', borderColor: 'var(--line)' }} />
                        <div style={{ height: '0.8rem', width: '3.5rem', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyGarden() {
    return (
        <div className="garden">
            <div className="garden-row">
                <Hills flipped={false} />
                <div className="sprout" style={{ left: '50%', bottom: '58px' }}>
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

    const sorted = [...childrenData].sort((a, b) => a.name.localeCompare(b.name));
    const rows = chunk(sorted, 3);

    return (
        <div className="garden">
            {rows.map((row, rowIdx) => {
                const layout = SLOTS[row.length] || SLOTS[3];
                const flipped = rowIdx % 2 === 1;
                const bottoms = flipped ? [...layout.bottoms].reverse() : layout.bottoms;

                return (
                    <div className="garden-row" key={rowIdx}>
                        <Hills flipped={flipped} />
                        {row.map((child, i) => {
                            const record = child.todayRecord;
                            const grown = !!record;
                            const isAuto = grown && record.isAuto;

                            return (
                                <div
                                    key={child.id}
                                    className="sprout"
                                    style={{ left: `${layout.lefts[i]}%`, bottom: `${bottoms[i]}px` }}
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
                                        <span aria-hidden="true">{child.icon}</span>
                                    </button>

                                    <span className="sprout-name">{child.name}</span>
                                    {!grown && (
                                        <span className="sprout-meta">{child.totalHours.toFixed(1)}h total</span>
                                    )}

                                    <div
                                        className={`sprout-stem ${grown ? 'stem-grown' : 'stem-dormant'}`}
                                        aria-hidden="true"
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
