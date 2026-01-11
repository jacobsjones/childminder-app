import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a professional invoice PDF
 * @param {Object} invoiceData - Invoice data
 * @param {string} invoiceData.childName - Child's name
 * @param {string} invoiceData.parentEmail - Parent's email
 * @param {number} invoiceData.totalHours - Total hours
 * @param {number} invoiceData.hourlyRate - Hourly rate
 * @param {Array} invoiceData.sessions - Array of session objects
 * @param {Object} invoiceData.settings - Business settings (optional)
 * @returns {Object} - { pdfBlob, pdfDataUri }
 */
export function generateInvoicePDF(invoiceData) {
    const { childName, parentEmail, totalHours, hourlyRate, sessions, settings } = invoiceData;

    const totalCost = (totalHours * hourlyRate).toFixed(2);
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${childName.replace(/\s+/g, '').toUpperCase()}`;

    // Create new PDF
    const doc = new jsPDF();

    // Add autoTable method using proper binding
    if (typeof autoTable === 'function') {
        doc.autoTable = function (options) {
            return autoTable(doc, options);
        };
    }

    // Set colors
    const primaryColor = [59, 130, 246]; // Blue
    const darkColor = [30, 41, 59];
    const grayColor = [100, 116, 139];

    // Header with business name
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(settings?.businessName || 'Invoice', 20, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Childcare Services', 20, 28);

    // Invoice details section
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoiceNumber}`, 20, 50);
    doc.text(`Date: ${currentDate}`, 20, 56);

    // Bill To section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 20, 70);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Parent/Guardian of ${childName}`, 20, 78);
    doc.text(`Email: ${parentEmail || 'Not provided'}`, 20, 84);

    // Sessions table
    if (sessions && sessions.length > 0) {
        const tableData = sessions.map((session, index) => {
            let hours, date, startTime = '-', endTime = '-';

            // Support both new hours-based and old time-based sessions
            if (session.hours !== undefined) {
                // New hours-based system
                hours = session.hours.toFixed(2);
                date = new Date(session.date).toLocaleDateString('en-GB');
            } else if (session.startTime && session.endTime) {
                // Old time-based system (backward compatibility)
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

        doc.autoTable({
            startY: 95,
            head: [['#', 'Date', 'Start Time', 'End Time', 'Hours', 'Cost']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            styles: {
                fontSize: 9,
                cellPadding: 5
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 35 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30, halign: 'right' }
            }
        });
    }

    // Summary section
    const summaryY = sessions && sessions.length > 0 ? doc.lastAutoTable.finalY + 20 : 95;

    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.5);
    doc.line(120, summaryY, 190, summaryY);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Total Hours:', 120, summaryY + 10);
    doc.text(`${totalHours.toFixed(2)} hrs`, 190, summaryY + 10, { align: 'right' });

    doc.text('Hourly Rate:', 120, summaryY + 18);
    doc.text(`£${hourlyRate.toFixed(2)}`, 190, summaryY + 18, { align: 'right' });

    doc.line(120, summaryY + 22, 190, summaryY + 22);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Total Amount Due:', 120, summaryY + 32);
    doc.text(`£${totalCost}`, 190, summaryY + 32, { align: 'right' });

    // Payment Information Box
    const paymentBoxY = summaryY + 45;

    // Draw payment information box if settings are available
    if (settings && settings.bankName) {
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, paymentBoxY, 170, 55, 3, 3);

        doc.setFillColor(59, 130, 246, 0.1);
        doc.roundedRect(20, paymentBoxY, 170, 10, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Payment Information', 25, paymentBoxY + 7);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...darkColor);

        let yOffset = paymentBoxY + 17;

        doc.text('Please make payment to:', 25, yOffset);
        yOffset += 6;

        if (settings.accountName) {
            doc.setFont(undefined, 'bold');
            doc.text('Account Name:', 25, yOffset);
            doc.setFont(undefined, 'normal');
            doc.text(settings.accountName, 85, yOffset);
            yOffset += 6;
        }

        if (settings.bankName) {
            doc.setFont(undefined, 'bold');
            doc.text('Bank:', 25, yOffset);
            doc.setFont(undefined, 'normal');
            doc.text(settings.bankName, 85, yOffset);
            yOffset += 6;
        }

        if (settings.sortCode) {
            doc.setFont(undefined, 'bold');
            doc.text('Sort Code:', 25, yOffset);
            doc.setFont(undefined, 'normal');
            doc.text(settings.sortCode, 85, yOffset);
            yOffset += 6;
        }

        if (settings.accountNumber) {
            doc.setFont(undefined, 'bold');
            doc.text('Account Number:', 25, yOffset);
            doc.setFont(undefined, 'normal');
            doc.text(settings.accountNumber, 85, yOffset);
            yOffset += 6;
        }

        if (settings.paymentTermsNote) {
            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            const noteLines = doc.splitTextToSize(settings.paymentTermsNote, 160);
            doc.text(noteLines, 25, yOffset + 2);
        }
    } else {
        // Fallback to simple payment terms if no settings
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...grayColor);
        doc.text('Payment Terms: Due within 7 days of invoice date', 20, paymentBoxY);
    }

    // Thank you message
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(...grayColor);
    doc.text('Thank you for your business!', 105, paymentBoxY + 65, { align: 'center' });

    /* Footer
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    const footerY = 280;
    doc.text('This is a computer-generated invoice.', 105, footerY, { align: 'center' }); */

    // Generate blob and data URI
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('dataurlstring');

    return {
        pdfBlob,
        pdfDataUri,
        fileName: `Invoice_${childName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    };
}
