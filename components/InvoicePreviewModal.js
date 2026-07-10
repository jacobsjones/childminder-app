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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Invoice preview">
                {/* Header */}
                <div className="row-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--line)' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.2rem' }}>Invoice preview</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
                            Check it over before it goes to {invoiceData.parentEmail || 'the parent'}.
                        </p>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close preview">
                        <X size={22} />
                    </button>
                </div>

                {/* PDF Preview */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1rem', backgroundColor: 'var(--surface-2)' }}>
                    <iframe
                        src={pdfDataUri}
                        style={{
                            width: '100%',
                            height: '600px',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-md)',
                            backgroundColor: '#fff'
                        }}
                        title="Invoice preview"
                    />
                </div>

                {/* Footer */}
                <div className="row-between" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button onClick={handleDownload} className="btn btn-outline">
                        <Download size={17} />
                        Download PDF
                    </button>

                    <div className="row" style={{ flexWrap: 'wrap' }}>
                        <button onClick={onClose} className="btn btn-ghost">
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={isSending || sendStatus === 'success'}
                            className="btn btn-primary"
                            style={{ cursor: isSending ? 'wait' : undefined }}
                        >
                            <Send size={17} />
                            {isSending ? 'Sending…' : sendStatus === 'success' ? 'Sent!' : `Send to ${invoiceData.parentEmail || 'parent'}`}
                        </button>
                    </div>
                </div>

                {/* Status Messages */}
                {sendStatus === 'success' && (
                    <div role="status" style={{ padding: '0.9rem', backgroundColor: 'var(--leaf-soft)', color: 'var(--leaf-deep)', textAlign: 'center', fontWeight: 600 }}>
                        ✓ Invoice sent — nice one!
                    </div>
                )}
                {sendStatus === 'error' && (
                    <div role="alert" style={{ padding: '0.9rem', backgroundColor: 'var(--berry-soft)', color: 'var(--berry-deep)', textAlign: 'center', fontWeight: 600 }}>
                        Couldn&apos;t send it — please try again.
                    </div>
                )}
            </div>
        </div>
    );
}
