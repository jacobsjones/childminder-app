/**
 * Rebuilding a past invoice.
 *
 * The PDF itself is never stored — invoices are rebuilt on demand from the
 * detail captured on the invoice row when it was sent (hours, rate, period,
 * invoice date, and a snapshot of the business settings as they were at the
 * time). Rebuilding from a snapshot rather than from live settings means a
 * re-sent invoice matches the one the parent originally received, even if the
 * address or hourly rate has changed since.
 */

/** An invoice row can only be rebuilt if the hours and rate were captured. */
export function canRebuildInvoice(record) {
    return Boolean(record)
        && record.totalHours !== null && record.totalHours !== undefined
        && record.hourlyRate !== null && record.hourlyRate !== undefined;
}

/**
 * Turn a stored invoice row into the input the PDF and email builders accept.
 *
 * @param {Object} record - An invoice row from getInvoice / getInvoices
 * @returns {Object}
 */
export function invoiceInputFromRecord(record) {
    return {
        childName: record.childName,
        totalHours: record.totalHours,
        hourlyRate: record.hourlyRate,
        totalCost: record.amount,
        periodLabel: record.period,
        invoiceDate: record.invoiceDate || record.dateSent,
        settings: record.settingsSnapshot || {},
    };
}

/** File name for a rebuilt invoice, dated when the invoice was raised. */
export function storedInvoiceFileName(record) {
    const safeName = (record.childName || 'Invoice').replace(/\s+/g, '_');
    const stamp = (record.invoiceDate || record.dateSent || new Date().toISOString()).slice(0, 10);
    return `Invoice_${safeName}_${stamp}.pdf`;
}
