'use client';
import { useState } from 'react';
import { X, Send, Download } from 'lucide-react';

export default function InvoicePreviewModal({ isOpen, onClose, pdfDataUri, fileName, invoiceData, onSendEmail }) {
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null); // 'success' | 'error'

    if (!isOpen) return null;

    const handleSendEmail = async () => {
        setIsSending(true);
        setSendStatus(null);

        try {
            await onSendEmail();
            setSendStatus('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error sending invoice:', error);
            setSendStatus('error');
        } finally {
            setIsSending(false);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = fileName;
        link.click();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '1rem',
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div>
                        <h2 style={{ marginBottom: '0.25rem' }}>Invoice Preview</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Review before sending to {invoiceData.parentEmail || 'parent'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* PDF Preview */}
                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '1rem',
                        backgroundColor: 'var(--bg-color)'
                    }}
                >
                    <iframe
                        src={pdfDataUri}
                        style={{
                            width: '100%',
                            height: '600px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            backgroundColor: 'white'
                        }}
                        title="Invoice Preview"
                    />
                </div>

                {/* Footer with Actions */}
                <div
                    style={{
                        padding: '1.5rem',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
                        <button
                            onClick={handleDownload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Download size={18} />
                            Download PDF
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-color)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={isSending || sendStatus === 'success'}
                            className="bg-blue"
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                fontWeight: 600,
                                cursor: isSending ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: isSending || sendStatus === 'success' ? 0.7 : 1
                            }}
                        >
                            <Send size={18} />
                            {isSending ? 'Sending...' : sendStatus === 'success' ? 'Sent!' : `Send to ${invoiceData.parentEmail || 'Parent'}`}
                        </button>
                    </div>
                </div>

                {/* Status Messages */}
                {sendStatus === 'success' && (
                    <div
                        style={{
                            padding: '1rem',
                            backgroundColor: 'var(--primary-green)',
                            color: 'var(--primary-green-text)',
                            textAlign: 'center',
                            fontWeight: 600
                        }}
                    >
                        ✓ Invoice sent successfully!
                    </div>
                )}
                {sendStatus === 'error' && (
                    <div
                        style={{
                            padding: '1rem',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            textAlign: 'center',
                            fontWeight: 600
                        }}
                    >
                        ✗ Failed to send invoice. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
}
