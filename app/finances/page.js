'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, Camera } from 'lucide-react';
import { getExpenses, addExpense, getChildren, getAttendance } from '@/lib/store';
import jsPDF from 'jspdf';

export default function FinancesPage() {
    const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'expenses'
    const [children, setChildren] = useState([]);
    const [expenses, setExpenses] = useState([]);

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

    const generateInvoice = (child) => {
        // 1. Calculate hours (Mock logic: fetch attendance)
        // In a real app, we'd filter by date range. Here we grab all completed sessions for simplicty or just mock "This Month".
        // For MVP, lets sum up all 'unpaid' hours (we didn't implement paid flag yet, so just all completed sessions).
        const allAttendance = getAttendance();
        const childSessions = allAttendance.filter(a => a.childId === child.id && a.endTime);

        let totalHours = 0;
        childSessions.forEach(s => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);
            const hours = (end - start) / (1000 * 60 * 60);
            totalHours += hours;
        });

        // Round to 10 mins or just 2 decimals
        totalHours = Math.round(totalHours * 100) / 100;
        const totalCost = (totalHours * child.rate).toFixed(2);

        // 2. Generate PDF
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("INVOICE", 20, 20);

        doc.setFontSize(16);
        doc.text(`To: Parent of ${child.name}`, 20, 40);
        doc.text(`Email: ${child.email || 'N/A'}`, 20, 50);

        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 70);
        doc.text("------------------------------------------------", 20, 80);
        doc.text(`Total Hours: ${totalHours} hrs`, 20, 90);
        doc.text(`Hourly Rate: £${child.rate}`, 20, 100);
        doc.text("------------------------------------------------", 20, 110);

        doc.setFontSize(18);
        doc.text(`TOTAL DUE: £${totalCost}`, 20, 130);

        doc.save(`Invoice_${child.name}_${new Date().toISOString().split('T')[0]}.pdf`);

        alert(`Invoice for ${child.name} downloaded!`);
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
                        <p>Tap a child to generate this month's invoice.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {children.map(child => (
                            <div key={child.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                                <div>
                                    <h3>{child.name}</h3>
                                    <p>£{child.rate}/hr</p>
                                </div>
                                <button
                                    onClick={() => generateInvoice(child)}
                                    className="bg-blue"
                                    style={{ padding: '0.8rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}
                                >
                                    Generate PDF
                                </button>
                            </div>
                        ))}
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
        </main>
    );
}
