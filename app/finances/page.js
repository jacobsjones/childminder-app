'use client';
import { useState, useEffect, useCallback } from 'react';
import { Camera, Send, MailWarning } from 'lucide-react';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';

const nameHash = (name) => name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export default function FinancesPage() {
    const [activeTab, setActiveTab] = useState('invoices');
    const [children, setChildren] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [settings, setSettings] = useState(null);
    const [invoices, setInvoices] = useState([]);

    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        pdfDataUri: null,
        fileName: null,
        invoiceData: null
    });

    const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });

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
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadData(), 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    const [summaries, setSummaries] = useState({});

    useEffect(() => {
        const updateSummaries = async () => {
            try {
                const response = await fetch('/api/sync');
                if (!response.ok) return;

                const { attendance: allAttendance } = await response.json();
                const newSummaries = {};

                for (const child of children) {
                    const childSessions = allAttendance.filter(a => a.childId === child.id && (a.hours !== undefined || a.endTime));
                    let totalHours = 0;
                    childSessions.forEach(s => {
                        if (s.hours !== undefined) {
                            totalHours += s.hours;
                        } else if (s.startTime && s.endTime) {
                            const start = new Date(s.startTime);
                            const end = new Date(s.endTime);
                            totalHours += (end - start) / (1000 * 60 * 60);
                        }
                    });
                    newSummaries[child.id] = {
                        hours: totalHours,
                        cost: (totalHours * child.rate).toFixed(2)
                    };
                }
                setSummaries(newSummaries);
            } catch (error) {
                console.error('Failed to update summaries:', error);
            }
        };

        if (children.length > 0) {
            updateSummaries();
        }
    }, [children]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.desc || !expenseForm.amount) return;
        console.log('Expense add not yet implemented');
        setExpenseForm({ desc: '', amount: '' });
    };

    const handleGenerateInvoice = async (child) => {
        try {
            const response = await fetch('/api/sync');
            if (!response.ok) throw new Error('Failed to fetch attendance');

            const { attendance: allAttendance } = await response.json();
            const childSessions = allAttendance.filter(a => {
                return a.childId === child.id && (a.hours !== undefined || a.endTime);
            });

            let totalHours = 0;
            childSessions.forEach(s => {
                if (s.hours !== undefined) {
                    totalHours += s.hours;
                } else if (s.startTime && s.endTime) {
                    const start = new Date(s.startTime);
                    const end = new Date(s.endTime);
                    const hours = (end - start) / (1000 * 60 * 60);
                    totalHours += hours;
                }
            });

            totalHours = Math.round(totalHours * 100) / 100;

            const invoiceData = {
                childName: child.name,
                parentEmail: child.email || '',
                totalHours: totalHours,
                hourlyRate: child.rate,
                sessions: childSessions,
                settings: settings
            };

            const { pdfDataUri, fileName } = generateInvoicePDF(invoiceData);

            setPreviewModal({
                isOpen: true,
                pdfDataUri,
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
                totalCost: (invoiceData.totalHours * invoiceData.hourlyRate).toFixed(2),
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

    const closePreviewModal = () => {
        setPreviewModal({
            isOpen: false,
            pdfDataUri: null,
            fileName: null,
            invoiceData: null
        });
    };

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
                    <div className="stack">
                        {children.map(child => {
                            const summary = summaries[child.id] || { hours: 0, cost: '0.00' };
                            const sum = nameHash(child.name);

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
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateInvoice(child)}
                                        className="btn btn-primary"
                                        disabled={!child.email}
                                        title={child.email ? `Preview invoice for ${child.name}` : 'Add a parent email first'}
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
                        <div className="row-between" style={{ marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Sent this month</h2>
                            {invoices.length > 0 && (
                                <span className="stat-number" style={{ fontSize: '1.5rem', color: 'var(--leaf-deep)' }}>
                                    £{thisMonthTotal.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {invoices.length === 0 ? (
                            <div className="card empty-state">
                                <span className="empty-emoji" aria-hidden="true">💌</span>
                                <p style={{ margin: '0 auto' }}>Nothing sent yet — your invoice history will land here.</p>
                            </div>
                        ) : (
                            <div className="stack" style={{ gap: '0.75rem' }}>
                                {invoices.map(invoice => (
                                    <div key={invoice.id} className="card row-between" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
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
                                            <span className="chip chip-leaf">Sent ✓</span>
                                        </div>
                                    </div>
                                ))}
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
                fileName={previewModal.fileName}
                invoiceData={previewModal.invoiceData}
                onSendEmail={handleSendEmail}
            />
        </main>
    );
}
