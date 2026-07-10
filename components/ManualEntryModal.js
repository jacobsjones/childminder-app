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
        const isDuplicate = existingDates.includes(date);

        if (isDuplicate) {
            const confirmed = confirm(`A record already exists for ${new Date(date).toLocaleDateString()}. Overwrite it?`);
            if (!confirmed) return;
        }

        onSave({ date, hours: parseFloat(hours) });

        setDate(yesterdayStr);
        setHours(0);
        onClose();
    };

    const increment = () => setHours(prev => Math.round((parseFloat(prev) + 0.5) * 2) / 2);
    const decrement = () => setHours(prev => Math.max(0, Math.round((parseFloat(prev) - 0.5) * 2) / 2));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add past attendance">
                <div className="row-between" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Add a past day</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ width: '36px', height: '36px' }} aria-label="Close">
                        <X size={19} />
                    </button>
                </div>

                <label htmlFor="manual-date">Date</label>
                <input
                    id="manual-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

                <label htmlFor="manual-hours">Hours</label>
                <div className="row" style={{ gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={decrement}
                        className="stepper-btn stepper-minus"
                        style={{ width: '44px', height: '44px', fontSize: '1.4rem' }}
                        aria-label="Half an hour less"
                    >
                        −
                    </button>
                    <input
                        id="manual-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={hours}
                        onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '1.2rem', marginBottom: 0 }}
                    />
                    <button
                        onClick={increment}
                        className="stepper-btn stepper-plus"
                        style={{ width: '44px', height: '44px', fontSize: '1.4rem' }}
                        aria-label="Half an hour more"
                    >
                        +
                    </button>
                </div>

                <div className="row">
                    <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!date || hours <= 0}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        Save record
                    </button>
                </div>
            </div>
        </div>
    );
}
