'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Send, MailWarning, Download, RotateCcw, Trash2 } from 'lucide-react';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import {
    availableMonthKeys,
    calculateTotalHours,
    currentMonthKey,
    filterAttendanceByMonthKey,
    formatMonthKey,
} from '@/lib/monthHelper';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';
import { canRebuildInvoice, storedInvoiceFileName } from '@/lib/storedInvoice';
import { savePdfFile } from '@/lib/savePdf';

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function FinancesPage() {
    const [activeTab, setActiveTab] = useState('invoices');
    const [children, setChildren] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [settings, setSettings] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [attendance, setAttendance] = useState([]);

    // Invoices cover one month at a time; default to the month we are in.
    const [monthKey, setMonthKey] = useState(currentMonthKey);

    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        pdfDataUri: null,
        fileName: null,
        invoiceData: null
    });

    const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });

    // Per-invoice re-send and status state, keyed by invoice id
    const [resendState, setResendState] = useState({});
    const [statusPending, setStatusPending] = useState({});
    const [deletePending, setDeletePending] = useState({});
    // 'loading' while a past invoice is being rebuilt, or the File once it is
    // ready but still needs a fresh tap to open the share sheet
    const [downloadState, setDownloadState] = useState({});

    const loadData = useCallback(async () => {
        try {
            const childrenResponse = await fetch('/api/children');
            if (childrenResponse.ok) {
                setChildren(await childrenResponse.json());
            }

            setExpenses([]);

            const settingsResponse = await fetch('/api/settings');
            if (settingsResponse.ok) {
                setSettings(await settingsResponse.json());
            }

            const invoicesResponse = await fetch('/api/invoices');
            if (invoicesResponse.ok) {
                setInvoices(await invoicesResponse.json());
            }

            const syncResponse = await fetch('/api/sync');
            if (syncResponse.ok) {
                const { attendance: allAttendance } = await syncResponse.json();
                setAttendance(allAttendance || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadData(), 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    // Months that have hours, so she can invoice a month after it has ended
    const monthOptions = useMemo(() => availableMonthKeys(attendance), [attendance]);

    // Hours and cost per child for the selected month only
    const summaries = useMemo(() => {
        const monthAttendance = filterAttendanceByMonthKey(attendance, monthKey);
        const byChild = {};

        children.forEach(child => {
            const sessions = monthAttendance.filter(record => record.childId === child.id);
            const hours = calculateTotalHours(sessions);
            byChild[child.id] = {
                hours,
                sessions,
                cost: (hours * child.rate).toFixed(2),
            };
        });

        return byChild;
    }, [attendance, children, monthKey]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.desc || !expenseForm.amount) return;
        console.log('Expense add not yet implemented');
        setExpenseForm({ desc: '', amount: '' });
    };

    const handleGenerateInvoice = (child) => {
        try {
            const summary = summaries[child.id];
            if (!summary || summary.hours === 0) return;

            // Pinned so the stored invoice and the PDF the parent receives
            // always carry the same date, even across midnight.
            const invoiceDate = new Date().toISOString();

            const invoiceData = {
                childName: child.name,
                parentEmail: child.email || '',
                totalHours: summary.hours,
                hourlyRate: child.rate,
                periodLabel: formatMonthKey(monthKey),
                invoiceDate,
                sessions: summary.sessions,
                settings: settings
            };

            const { pdfDataUri, pdfBlob, fileName } = generateInvoicePDF(invoiceData);

            setPreviewModal({
                isOpen: true,
                pdfDataUri,
                pdfBlob,
                fileName,
                invoiceData
            });
        } catch (error) {
            console.error('Failed to generate invoice:', error);
            alert('Failed to generate invoice');
        }
    };

    const handleSendEmail = async () => {
        const { invoiceData, pdfDataUri, fileName } = previewModal;

        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                childName: invoiceData.childName,
                parentEmail: invoiceData.parentEmail,
                totalHours: invoiceData.totalHours,
                hourlyRate: invoiceData.hourlyRate,
                totalCost: (invoiceData.totalHours * invoiceData.hourlyRate).toFixed(2),
                periodLabel: invoiceData.periodLabel,
                invoiceDate: invoiceData.invoiceDate,
                pdfBase64: pdfDataUri,
                fileName: fileName
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Failed to send invoice');
        }

        return await response.json();
    };

    const handleResend = async (invoice) => {
        const confirmed = window.confirm(
            `Re-send the ${invoice.period} invoice for ${invoice.childName} to ${invoice.parentEmail}?`
        );
        if (!confirmed) return;

        setResendState(prev => ({ ...prev, [invoice.id]: 'sending' }));

        try {
            const response = await fetch(`/api/invoices/${invoice.id}/resend`, { method: 'POST' });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to re-send invoice');
            }

            setResendState(prev => ({ ...prev, [invoice.id]: 'sent' }));
        } catch (error) {
            console.error('Failed to re-send invoice:', error);
            setResendState(prev => ({ ...prev, [invoice.id]: 'error' }));
            alert(error.message);
        }
    };

    const handleTogglePaid = async (invoice) => {
        const nextStatus = invoice.status === 'Paid' ? 'Sent' : 'Paid';
        setStatusPending(prev => ({ ...prev, [invoice.id]: true }));

        try {
            const response = await fetch(`/api/invoices/${invoice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to update invoice');
            }

            const { invoice: updated } = await response.json();
            setInvoices(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        } catch (error) {
            console.error('Failed to update invoice status:', error);
            alert(error.message);
        } finally {
            setStatusPending(prev => ({ ...prev, [invoice.id]: false }));
        }
    };

    const handleDownloadPast = async (invoice) => {
        const clear = () => setDownloadState(prev => ({ ...prev, [invoice.id]: undefined }));

        try {
            let file = downloadState[invoice.id];

            if (!(file instanceof File)) {
                setDownloadState(prev => ({ ...prev, [invoice.id]: 'loading' }));

                const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || 'Failed to download invoice');
                }

                file = new File([await response.blob()], storedInvoiceFileName(invoice), { type: 'application/pdf' });
            }

            const saved = await savePdfFile(file);
            if (saved) {
                clear();
            } else {
                setDownloadState(prev => ({ ...prev, [invoice.id]: file }));
            }
        } catch (error) {
            console.error('Failed to download invoice:', error);
            clear();
            alert(error.message);
        }
    };

    const handleDelete = async (invoice) => {
        const confirmed = window.confirm(
            `Delete the ${invoice.period} invoice for ${invoice.childName} from your history? This can't be undone.`
        );
        if (!confirmed) return;

        setDeletePending(prev => ({ ...prev, [invoice.id]: true }));

        try {
            const response = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to delete invoice');
            }

            setInvoices(prev => prev.filter(item => item.id !== invoice.id));
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            alert(error.message);
        } finally {
            setDeletePending(prev => ({ ...prev, [invoice.id]: false }));
        }
    };

    const closePreviewModal = () => {
        setPreviewModal({
            isOpen: false,
            pdfDataUri: null,
            fileName: null,
            invoiceData: null
        });
    };

    const outstandingTotal = invoices
        .filter(inv => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

    const thisMonthTotal = (() => {
        const now = new Date();
        return invoices
            .filter(inv => {
                const invoiceDate = new Date(inv.dateSent);
                return invoiceDate.getMonth() === now.getMonth() &&
                    invoiceDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, inv) => sum + inv.amount, 0);
    })();

    return (
        <main>
            <header style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Invoices</h1>
                <p className="page-sub">Preview, send and track invoices for each family.</p>
            </header>

            {/* Tabs */}
            <div className="seg" style={{ marginBottom: '1.5rem' }} role="tablist">
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`seg-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'invoices'}
                >
                    Invoices
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`seg-btn ${activeTab === 'expenses' ? 'active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'expenses'}
                >
                    My spending
                </button>
            </div>

            {activeTab === 'invoices' && (
                <section>
                    <div className="card row-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Billing month</h3>
                            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                                An invoice covers only the hours logged in the month you pick.
                            </p>
                        </div>
                        <select
                            id="invoice-month"
                            aria-label="Billing month"
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            style={{ marginBottom: 0, width: 'auto', minWidth: '12rem' }}
                        >
                            {monthOptions.map(key => (
                                <option key={key} value={key}>{formatMonthKey(key)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="stack">
                        {children.map(child => {
                            const summary = summaries[child.id] || { hours: 0, cost: '0.00' };
                            const sum = nameHash(child.name);
                            const hasHours = summary.hours > 0;

                            return (
                                <div key={child.id} className="card row-between" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
                                    <div className="row">
                                        <div className={`avatar blob-${sum % 4}`} aria-hidden="true">
                                            {child.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0 }}>{child.name}</h3>
                                            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                                {summary.hours.toFixed(1)} hrs @ £{child.rate}/hr
                                                {' · '}
                                                <strong style={{ color: 'var(--ink)' }}>£{summary.cost}</strong>
                                            </p>
                                            {child.email ? (
                                                <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                                                    {child.email}
                                                </p>
                                            ) : (
                                                <span className="chip chip-berry" style={{ marginTop: '0.35rem' }}>
                                                    <MailWarning size={13} aria-hidden="true" /> No parent email yet
                                                </span>
                                            )}
                                            {!hasHours && (
                                                <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                                                    No hours logged this month
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateInvoice(child)}
                                        className="btn btn-primary"
                                        disabled={!child.email || !hasHours}
                                        title={
                                            !child.email
                                                ? 'Add a parent email first'
                                                : !hasHours
                                                    ? `No hours logged for ${child.name} in ${formatMonthKey(monthKey)}`
                                                    : `Preview invoice for ${child.name}`
                                        }
                                    >
                                        <Send size={17} /> Preview
                                    </button>
                                </div>
                            );
                        })}
                        {children.length === 0 && (
                            <div className="card empty-state" style={{ marginBottom: 0 }}>
                                <span className="empty-emoji" aria-hidden="true">🧾</span>
                                <p style={{ margin: '0 auto' }}>Add a child first — invoices are built from their logged hours.</p>
                            </div>
                        )}
                    </div>

                    {/* Invoice History */}
                    <div style={{ marginTop: '2.5rem' }}>
                        <div className="row-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0 }}>Invoice history</h2>
                            {invoices.length > 0 && (
                                <div className="row" style={{ gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="stat-number" style={{ fontSize: '1.35rem', color: 'var(--leaf-deep)', display: 'block' }}>
                                            £{thisMonthTotal.toFixed(2)}
                                        </span>
                                        <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>sent this month</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="stat-number" style={{ fontSize: '1.35rem', display: 'block' }}>
                                            £{outstandingTotal.toFixed(2)}
                                        </span>
                                        <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>outstanding</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {invoices.length === 0 ? (
                            <div className="card empty-state">
                                <span className="empty-emoji" aria-hidden="true">💌</span>
                                <p style={{ margin: '0 auto' }}>Nothing sent yet — your invoice history will land here.</p>
                            </div>
                        ) : (
                            <div className="stack" style={{ gap: '0.75rem' }}>
                                {invoices.map(invoice => {
                                    const rebuildable = canRebuildInvoice(invoice);
                                    const sendState = resendState[invoice.id];
                                    const isPaid = invoice.status === 'Paid';

                                    return (
                                    <div key={invoice.id} className="card" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
                                      <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{invoice.childName}</p>
                                            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                                                {new Date(invoice.dateSent).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })} · {invoice.period}
                                            </p>
                                            {invoice.parentEmail && (
                                                <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                                    {invoice.parentEmail}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p className="stat-number" style={{ fontSize: '1.15rem', marginBottom: '0.3rem' }}>
                                                £{invoice.amount.toFixed(2)}
                                            </p>
                                            <span className={`chip ${isPaid ? 'chip-leaf' : 'chip-sun'}`}>
                                                {isPaid ? 'Paid ✓' : 'Awaiting payment'}
                                            </span>
                                        </div>
                                      </div>

                                      <div className="row" style={{ marginTop: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleTogglePaid(invoice)}
                                                disabled={statusPending[invoice.id]}
                                            >
                                                {isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                                            </button>
                                            {rebuildable && (<>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleDownloadPast(invoice)}
                                                disabled={downloadState[invoice.id] === 'loading'}
                                            >
                                                <Download size={16} />
                                                {downloadState[invoice.id] === 'loading'
                                                    ? 'Preparing…'
                                                    : downloadState[invoice.id]
                                                        ? 'Tap to save'
                                                        : 'Download'}
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handleResend(invoice)}
                                                disabled={sendState === 'sending' || !invoice.parentEmail}
                                                title={invoice.parentEmail ? 'Send this invoice again' : 'No parent email on this invoice'}
                                            >
                                                <RotateCcw size={16} />
                                                {sendState === 'sending'
                                                    ? 'Sending…'
                                                    : sendState === 'sent'
                                                        ? 'Sent again ✓'
                                                        : 'Re-send'}
                                            </button>
                                            </>)}
                                            <button
                                                className="btn btn-danger-soft"
                                                onClick={() => handleDelete(invoice)}
                                                disabled={deletePending[invoice.id]}
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                <Trash2 size={16} />
                                                {deletePending[invoice.id] ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </div>
                                      {!rebuildable && (
                                        <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: '0.7rem' }}>
                                            Sent before invoices were re-sendable, so this one can&apos;t be rebuilt.
                                        </p>
                                      )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {activeTab === 'expenses' && (
                <section>
                    <form onSubmit={handleAddExpense} className="card">
                        <div className="row-between" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Log an expense</h3>
                            <span className="chip chip-sun">Coming soon</span>
                        </div>
                        <label htmlFor="expense-desc">What was it?</label>
                        <input
                            id="expense-desc"
                            placeholder="e.g. Snacks, craft supplies"
                            value={expenseForm.desc}
                            onChange={(e) => setExpenseForm({ ...expenseForm, desc: e.target.value })}
                            required
                        />
                        <label htmlFor="expense-amount">Cost (£)</label>
                        <input
                            id="expense-amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            required
                        />

                        <div className="row" style={{ marginBottom: '1rem', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                            <Camera size={18} aria-hidden="true" />
                            <span>Receipt photos coming soon</span>
                        </div>

                        <button type="submit" className="btn btn-soft btn-lg">
                            + Log expense
                        </button>
                    </form>

                    {expenses.length > 0 && (
                        <>
                            <h3>History</h3>
                            <div className="stack">
                                {expenses.map((exp) => (
                                    <div key={exp.id} className="card row-between" style={{ marginBottom: 0 }}>
                                        <span>{exp.description}</span>
                                        <strong className="stat-number">£{exp.amount.toFixed(2)}</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            )}

            <InvoicePreviewModal
                isOpen={previewModal.isOpen}
                onClose={closePreviewModal}
                pdfDataUri={previewModal.pdfDataUri}
                pdfBlob={previewModal.pdfBlob}
                fileName={previewModal.fileName}
                invoiceData={previewModal.invoiceData}
                onSendEmail={handleSendEmail}
            />
        </main>
    );
}
