'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { getExpenses, addExpense, getChildren, getAttendance } from '@/lib/store';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';

export default function FinancesPage() {
    const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'expenses'
    const [children, setChildren] = useState([]);
    const [expenses, setExpenses] = useState([]);

    // Invoice Preview Modal State
    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        pdfDataUri: null,
        fileName: null,
        invoiceData: null
    });

    // Expense Form
    const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });

    useEffect(() => {
        setChildren(getChildren());
        setExpenses(getExpenses());
    }, []);

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!expenseForm.desc || !expenseForm.amount) return;
        addExpense({ description: expenseForm.desc, amount: parseFloat(expenseForm.amount), type: 'expense' });
        setExpenses(getExpenses());
        setExpenseForm({ desc: '', amount: '' });
    };

    const handleGenerateInvoice = (child) => {
        // Get all attendance sessions for this child
        const allAttendance = getAttendance();
        const childSessions = allAttendance.filter(a => a.childId === child.id && a.endTime);

        // Calculate total hours
        let totalHours = 0;
        childSessions.forEach(s => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);
            const hours = (end - start) / (1000 * 60 * 60);
            totalHours += hours;
        });

        totalHours = Math.round(totalHours * 100) / 100;

        // Prepare invoice data
        const invoiceData = {
            childName: child.name,
            parentEmail: child.email || '',
            totalHours: totalHours,
            hourlyRate: child.rate,
            sessions: childSessions
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
                            // Calculate quick summary
                            const allAttendance = getAttendance();
                            const childSessions = allAttendance.filter(a => a.childId === child.id && a.endTime);
                            let totalHours = 0;
                            childSessions.forEach(s => {
                                const start = new Date(s.startTime);
                                const end = new Date(s.endTime);
                                totalHours += (end - start) / (1000 * 60 * 60);
                            });
                            const totalCost = (totalHours * child.rate).toFixed(2);

                            return (
                                <div key={child.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h3>{child.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {totalHours.toFixed(1)} hrs @ £{child.rate}/hr = £{totalCost}
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
