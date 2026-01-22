'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';

export default function FinancesPage() {
    const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'expenses'
    const [children, setChildren] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [settings, setSettings] = useState(null);
    const [invoices, setInvoices] = useState([]);

    // Invoice Preview Modal State
    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        pdfDataUri: null,
        fileName: null,
        invoiceData: null
    });

    // Expense Form
    const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });

    const loadData = useCallback(async () => {
        try {
            // Load children
            const childrenResponse = await fetch('/api/children');
            if (childrenResponse.ok) {
                setChildren(await childrenResponse.json());
            }

            // Load expenses (not yet implemented)
            setExpenses([]);

            // Load settings
            const settingsResponse = await fetch('/api/settings');
            if (settingsResponse.ok) {
                setSettings(await settingsResponse.json());
            }

            // Load invoices
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
        // Expenses not yet implemented for Postgres
        console.log('Expense add not yet implemented');
        setExpenseForm({ desc: '', amount: '' });
    };

    const handleGenerateInvoice = async (child) => {
        try {
            // Get all attendance sessions for this child
            const response = await fetch('/api/sync');
            if (!response.ok) throw new Error('Failed to fetch attendance');

            const { attendance: allAttendance } = await response.json();
        const childSessions = allAttendance.filter(a => {
            // Include hours-based records or completed time-based records
            return a.childId === child.id && (a.hours !== undefined || a.endTime);
        });

        // Calculate total hours (support both hours-based and time-based)
        let totalHours = 0;
        childSessions.forEach(s => {
            if (s.hours !== undefined) {
                // New hours-based system
                totalHours += s.hours;
            } else if (s.startTime && s.endTime) {
                // Old time-based system (backward compatibility)
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                const hours = (end - start) / (1000 * 60 * 60);
                totalHours += hours;
            }
        });

        totalHours = Math.round(totalHours * 100) / 100;

        // Prepare invoice data
        const invoiceData = {
            childName: child.name,
            parentEmail: child.email || '',
            totalHours: totalHours,
            hourlyRate: child.rate,
            sessions: childSessions,
            settings: settings // Include business settings for payment info
        };

        // Generate PDF
        const { pdfDataUri, fileName } = generateInvoicePDF(invoiceData);

        // Open preview modal
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

    return (
        <main>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <Link href="/" style={{ marginRight: '1rem', color: 'var(--text-color)' }}><ArrowLeft /></Link>
                <h1>Finances</h1>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '0.8rem' }}>
                <button
                    onClick={() => setActiveTab('invoices')}
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '0.6rem', background: activeTab === 'invoices' ? 'var(--bg-card)' : 'transparent', fontWeight: activeTab === 'invoices' ? 600 : 400, color: 'var(--text-color)' }}
                >
                    Invoices
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '0.6rem', background: activeTab === 'expenses' ? 'var(--bg-card)' : 'transparent', fontWeight: activeTab === 'expenses' ? 600 : 400, color: 'var(--text-color)' }}
                >
                    My Spending
                </button>
            </div>

            {activeTab === 'invoices' && (
                <section>
                    <div className="card bg-blue">
                        <h3>Ready to Invoice</h3>
                        <p>Preview and send professional invoices to parents via email.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {children.map(child => {
                            const summary = summaries[child.id] || { hours: 0, cost: '0.00' };

                            return (
                                <div key={child.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h3>{child.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {summary.hours.toFixed(1)} hrs @ £{child.rate}/hr = £{summary.cost}
                                        </p>
                                        {child.email && (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                📧 {child.email}
                                            </p>
                                        )}
                                        {!child.email && (
                                            <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                                                ⚠️ No email configured
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleGenerateInvoice(child)}
                                        className="bg-blue"
                                        style={{ padding: '0.8rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}
                                        disabled={!child.email}
                                    >
                                        Preview Invoice
                                    </button>
                                </div>
                            );
                        })}
                        {children.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No children found.</p>}
                    </div>

                    {/* Invoice History */}
                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ marginBottom: '1rem' }}>Invoice History</h2>

                        {/* Summary Card */}
                        {invoices.length > 0 && (
                            <div className="card bg-green" style={{ marginBottom: '1.5rem' }}>
                                <h3>Total Invoiced This Month</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>
                                    £{(() => {
                                        const now = new Date();
                                        const thisMonthInvoices = invoices.filter(inv => {
                                            const invoiceDate = new Date(inv.dateSent);
                                            return invoiceDate.getMonth() === now.getMonth() &&
                                                   invoiceDate.getFullYear() === now.getFullYear();
                                        });
                                        const total = thisMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                                        return total.toFixed(2);
                                    })()}
                                </p>
                            </div>
                        )}

                        {/* Sent Invoices List */}
                        <h3 style={{ marginBottom: '1rem' }}>Sent Invoices</h3>
                        {invoices.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No invoices sent yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {invoices.map(invoice => (
                                    <div key={invoice.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', marginBottom: 0 }}>
                                        <div>
                                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{invoice.childName}</p>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                {new Date(invoice.dateSent).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} • {invoice.period}
                                            </p>
                                            {invoice.parentEmail && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                    📧 {invoice.parentEmail}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                                £{invoice.amount.toFixed(2)}
                                            </p>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: '#dcfce7',
                                                color: '#166534'
                                            }}>
                                                Sent
                                            </span>
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
                    {/* Add Expense */}
                    <form onSubmit={handleAddExpense} className="card">
                        <h3>Add New Expense</h3>
                        <input
                            placeholder="What did you buy? (e.g. Snacks)"
                            value={expenseForm.desc}
                            onChange={(e) => setExpenseForm({ ...expenseForm, desc: e.target.value })}
                            required
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Cost (£)"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            required
                        />

                        {/* Fake Camera Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <Camera size={20} />
                            <span>Attach Receipt (Simulation)</span>
                        </div>

                        <button type="submit" className="bg-pink btn-large" style={{ fontSize: '1rem', padding: '0.8rem', marginBottom: 0 }}>
                            + Log Expense
                        </button>
                    </form>

                    {/* List */}
                    <h3>History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {expenses.map((exp) => (
                            <div key={exp.id} className="card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{exp.description}</span>
                                <strong>£{exp.amount.toFixed(2)}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Invoice Preview Modal */}
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
