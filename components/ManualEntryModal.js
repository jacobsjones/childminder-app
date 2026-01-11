'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function ManualEntryModal({ isOpen, onClose, onSave, existingDates = [] }) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const [date, setDate] = useState(yesterdayStr);
    const [hours, setHours] = useState(0);

    if (!isOpen) return null;

    const handleSave = () => {
        // Check if date already has a record
        const isDuplicate = existingDates.includes(date);

        if (isDuplicate) {
            const confirmed = confirm(`A record already exists for ${new Date(date).toLocaleDateString()}. Overwrite it?`);
            if (!confirmed) return;
        }

        onSave({ date, hours: parseFloat(hours) });

        // Reset form
        setDate(yesterdayStr);
        setHours(0);
        onClose();
    };

    const increment = () => setHours(prev => Math.round((parseFloat(prev) + 0.5) * 2) / 2);
    const decrement = () => setHours(prev => Math.max(0, Math.round((parseFloat(prev) - 0.5) * 2) / 2));

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '1.5rem',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Add Past Attendance</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Date Picker */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-color)',
                            color: 'var(--text-color)',
                            fontSize: '1rem',
                        }}
                    />
                </div>

                {/* Hours Input with Stepper */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Hours
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={decrement}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                            }}
                        >
                            −
                        </button>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                textAlign: 'center',
                            }}
                        />
                        <button
                            onClick={increment}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: 'var(--text-color)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!date || hours <= 0}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: date && hours > 0 ? 'var(--primary-blue)' : 'var(--border-color)',
                            color: 'white',
                            cursor: date && hours > 0 ? 'pointer' : 'not-allowed',
                            fontWeight: 500,
                        }}
                    >
                        Save Record
                    </button>
                </div>
            </div>
        </div>
    );
}
