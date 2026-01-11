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
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.title}>Log Hours for {childName}</h2>

                <div style={styles.hoursContainer}>
                    <button
                        style={{...styles.stepperButton, ...styles.decrementButton}}
                        onClick={decrement}
                    >
                        −
                    </button>

                    <div style={styles.hoursDisplay}>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(Math.max(0, parseFloat(e.target.value) || 0))}
                            style={styles.hoursInput}
                        />
                        <span style={styles.hoursLabel}>hours</span>
                    </div>

                    <button
                        style={{...styles.stepperButton, ...styles.incrementButton}}
                        onClick={increment}
                    >
                        +
                    </button>
                </div>

                <div style={styles.actions}>
                    <button style={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button style={styles.saveButton} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    title: {
        margin: '0 0 2rem 0',
        fontSize: '1.5rem',
        color: 'var(--text-color)',
        textAlign: 'center',
    },
    hoursContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        marginBottom: '2rem',
    },
    stepperButton: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: 'none',
        fontSize: '2rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: 'white',
    },
    decrementButton: {
        backgroundColor: '#ef4444',
    },
    incrementButton: {
        backgroundColor: '#10b981',
    },
    hoursDisplay: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
    },
    hoursInput: {
        fontSize: '3rem',
        fontWeight: 'bold',
        width: '120px',
        textAlign: 'center',
        border: '2px solid var(--border-color)',
        borderRadius: '12px',
        padding: '0.5rem',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-color)',
    },
    hoursLabel: {
        fontSize: '1rem',
        color: 'var(--text-secondary)',
    },
    actions: {
        display: 'flex',
        gap: '1rem',
    },
    cancelButton: {
        flex: 1,
        padding: '1rem',
        fontSize: '1.1rem',
        border: '2px solid var(--border-color)',
        borderRadius: '12px',
        backgroundColor: 'transparent',
        color: 'var(--text-color)',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s',
    },
    saveButton: {
        flex: 1,
        padding: '1rem',
        fontSize: '1.1rem',
        border: 'none',
        borderRadius: '12px',
        backgroundColor: 'var(--primary-blue)',
        color: 'white',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s',
    },
};
