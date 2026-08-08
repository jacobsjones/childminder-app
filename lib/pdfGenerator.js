import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a LittleHours invoice PDF (Fresh Garden branding)
 * @param {Object} invoiceData
 * @param {string} invoiceData.childName
 * @param {string} invoiceData.parentEmail
 * @param {number} invoiceData.totalHours
 * @param {number} invoiceData.hourlyRate
 * @param {Array} invoiceData.sessions
 * @param {Object} invoiceData.settings - Business settings (optional)
 * @returns {Object} - { pdfBlob, pdfDataUri, fileName }
 */

// Fresh Garden palette (RGB)
const LEAF = [61, 133, 88];
const LEAF_DEEP = [42, 90, 64];
const LEAF_SOFT = [223, 240, 226];
const HONEY = [242, 223, 158];
const INK = [43, 58, 49];
const INK_SOFT = [92, 110, 99];

export function generateInvoicePDF(invoiceData) {
    const { childName, parentEmail, totalHours, hourlyRate, sessions, settings } = invoiceData;

    const totalCost = (totalHours * hourlyRate).toFixed(2);
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${childName.replace(/\s+/g, '').toUpperCase()}`;

    const doc = new jsPDF(); // A4 portrait, mm
    const pageWidth = doc.internal.pageSize.getWidth();   // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297

    // ===== Header: leaf band with sun accent and a soft hill line =====
    doc.setFillColor(...LEAF);
    doc.rect(0, 0, pageWidth, 34, 'F');

    // Honey sun in the top-right corner
    doc.setFillColor(...HONEY);
    doc.circle(pageWidth - 24, 13, 8, 'F');

    // Soft hill strip under the band
    doc.setFillColor(...LEAF_SOFT);
    doc.rect(0, 34, pageWidth, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.businessName || 'Invoice', 20, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Childcare invoice', 20, 26);

    // ===== Invoice meta =====
    doc.setTextColor(...INK_SOFT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice number: ${invoiceNumber}`, pageWidth - 20, 50, { align: 'right' });
    doc.text(`Date: ${currentDate}`, pageWidth - 20, 56, { align: 'right' });

    // ===== Bill to =====
    doc.setTextColor(...INK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill to', 20, 50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Parent/Guardian of ${childName}`, 20, 58);
    doc.setTextColor(...INK_SOFT);
    doc.text(parentEmail || 'No email provided', 20, 64);

    // ===== Sessions table =====
    let tableEndY = 75;

    if (sessions && sessions.length > 0) {
        const tableData = sessions.map((session, index) => {
            let hours, date, startTime = '-', endTime = '-';

            if (session.hours !== undefined) {
                hours = session.hours.toFixed(2);
                date = new Date(session.date).toLocaleDateString('en-GB');
            } else if (session.startTime && session.endTime) {
                const start = new Date(session.startTime);
                const end = new Date(session.endTime);
                hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
                date = start.toLocaleDateString('en-GB');
                startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            } else {
                hours = '0.00';
                date = 'Unknown';
            }

            return [
                index + 1,
                date,
                startTime,
                endTime,
                hours,
                `£${(parseFloat(hours) * hourlyRate).toFixed(2)}`
            ];
        });

        autoTable(doc, {
            startY: 75,
            head: [['#', 'Date', 'Start', 'End', 'Hours', 'Cost']],
            body: tableData,
            theme: 'plain',
            headStyles: {
                fillColor: LEAF,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: INK
            },
            alternateRowStyles: {
                fillColor: LEAF_SOFT
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 34 },
                2: { cellWidth: 24 },
                3: { cellWidth: 24 },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 28, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
            didDrawPage: (data) => {
                tableEndY = data.cursor.y;
            }
        });

        // Fallbacks for final Y across plugin versions
        tableEndY = doc.lastAutoTable?.finalY ?? tableEndY;
    }

    // ===== Summary =====
    let summaryY = tableEndY + 14;

    // New page if the summary + payment box won't fit
    if (summaryY + 105 > pageHeight) {
        doc.addPage();
        summaryY = 25;
    }

    doc.setDrawColor(...INK_SOFT);
    doc.setLineWidth(0.4);
    doc.line(120, summaryY, pageWidth - 20, summaryY);

    doc.setTextColor(...INK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total hours', 120, summaryY + 8);
    doc.text(`${totalHours.toFixed(2)} hrs`, pageWidth - 20, summaryY + 8, { align: 'right' });

    doc.text('Hourly rate', 120, summaryY + 15);
    doc.text(`£${hourlyRate.toFixed(2)}`, pageWidth - 20, summaryY + 15, { align: 'right' });

    // Total due chip
    doc.setFillColor(...LEAF_SOFT);
    doc.roundedRect(116, summaryY + 20, pageWidth - 20 - 116, 13, 3, 3, 'F');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...LEAF_DEEP);
    doc.text('Total due', 120, summaryY + 29);
    doc.text(`£${totalCost}`, pageWidth - 20, summaryY + 29, { align: 'right' });

    // ===== Payment information =====
    const paymentBoxY = summaryY + 42;

    if (settings && settings.bankName) {
        doc.setDrawColor(...LEAF);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, paymentBoxY, pageWidth - 40, 55, 3, 3, 'S');

        doc.setFillColor(...LEAF_SOFT);
        doc.roundedRect(20, paymentBoxY, pageWidth - 40, 10, 3, 3, 'F');
        doc.setFillColor(...LEAF_SOFT);
        doc.rect(20, paymentBoxY + 5, pageWidth - 40, 5, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...LEAF_DEEP);
        doc.text('Payment information', 25, paymentBoxY + 7);

        doc.setFontSize(9);
        doc.setTextColor(...INK);

        let yOffset = paymentBoxY + 17;

        const paymentRow = (label, value) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 25, yOffset);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 70, yOffset);
            yOffset += 6;
        };

        if (settings.accountName) paymentRow('Account name', settings.accountName);
        if (settings.bankName) paymentRow('Bank', settings.bankName);
        if (settings.sortCode) paymentRow('Sort code', settings.sortCode);
        if (settings.accountNumber) paymentRow('Account number', settings.accountNumber);

        if (settings.paymentTermsNote) {
            doc.setFontSize(8);
            doc.setTextColor(...INK_SOFT);
            const noteLines = doc.splitTextToSize(settings.paymentTermsNote, pageWidth - 50);
            doc.text(noteLines, 25, yOffset + 2);
        }
    } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INK_SOFT);
        doc.text('Payment terms: due within 7 days of the invoice date', 20, paymentBoxY + 5);
    }

    // ===== Footer =====
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...INK_SOFT);
    doc.text('Thank you!', pageWidth / 2, paymentBoxY + 65, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Made with LittleHours', pageWidth / 2, pageHeight - 12, { align: 'center' });

    // Generate blob and data URI
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('dataurlstring');

    return {
        pdfBlob,
        pdfDataUri,
        fileName: `Invoice_${childName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    };
}
