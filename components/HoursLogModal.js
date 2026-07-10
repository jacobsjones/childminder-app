'use client';

import { useState } from 'react';

export default function HoursLogModal({ isOpen, onClose, childName, initialHours = 0, onSave }) {
    const [hours, setHours] = useState(initialHours);

    if (!isOpen) return null;

    const increment = () => setHours(prev => Math.round((prev + 0.5) * 2) / 2);
    const decrement = () => setHours(prev => Math.max(0, Math.round((prev - 0.5) * 2) / 2));

    const handleSave = () => {
        onSave(hours);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Log hours for ${childName}`}>
                <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>How long was {childName} here?</h2>
                <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.9rem', margin: '0 auto 1.75rem' }}>
                    Half-hour steps — or type it in.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                    <button className="stepper-btn stepper-minus" onClick={decrement} aria-label="Half an hour less">
                        −
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="hours-input"
                            aria-label="Hours"
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>hours</span>
                    </div>

                    <button className="stepper-btn stepper-plus" onClick={increment} aria-label="Half an hour more">
                        +
                    </button>
                </div>

                <div className="row">
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
