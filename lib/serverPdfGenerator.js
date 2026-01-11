import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a professional invoice PDF on the server using pdf-lib
 * @param {Object} invoiceData - Invoice data
 * @param {Object} invoiceData.child - Child object with name, rate, email
 * @param {string} invoiceData.monthName - Month name (e.g., "January 2026")
 * @param {number} invoiceData.totalHours - Total hours for the month
 * @param {number} invoiceData.rate - Hourly rate
 * @param {number} invoiceData.totalCost - Total cost
 * @param {Object} invoiceData.settings - Business settings with bank details
 * @param {Array} invoiceData.sessions - Array of session objects (optional, for detailed breakdown)
 * @returns {Promise<Uint8Array>} - PDF bytes
 */
export async function generateInvoicePDF(invoiceData) {
    const { child, monthName, totalHours, rate, totalCost, settings, sessions = [] } = invoiceData;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();

    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryBlue = rgb(59 / 255, 130 / 255, 246 / 255);
    const darkGray = rgb(30 / 255, 41 / 255, 59 / 255);
    const lightGray = rgb(100 / 255, 116 / 255, 139 / 255);
    const white = rgb(1, 1, 1);

    let yPosition = height - 60;

    // Header Background
    page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: primaryBlue,
    });

    // Business Name / Title
    const businessName = settings?.businessName || 'Invoice';
    page.drawText(businessName, {
        x: 50,
        y: height - 70,
        size: 28,
        font: boldFont,
        color: white,
    });

    page.drawText('Childcare Services', {
        x: 50,
        y: height - 90,
        size: 10,
        font: regularFont,
        color: white,
    });

    // Invoice Number and Date
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${child.name.replace(/\s+/g, '').toUpperCase()}`;

    yPosition = height - 130;
    page.drawText(`Invoice Number: ${invoiceNumber}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    yPosition -= 15;
    page.drawText(`Date: ${currentDate}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    // Bill To Section
    yPosition -= 30;
    page.drawText('Bill To:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: darkGray,
    });

    yPosition -= 20;
    page.drawText(`Parent/Guardian of ${child.name}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    yPosition -= 15;
    page.drawText(`Email: ${child.email || 'Not provided'}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    // Invoice Period
    yPosition -= 30;
    page.drawText('Invoice Period:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: darkGray,
    });

    yPosition -= 20;
    page.drawText(monthName, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    // Sessions Table (if provided)
    if (sessions && sessions.length > 0) {
        yPosition -= 40;

        // Table Header
        page.drawText('Date', {
            x: 50,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });
        page.drawText('Hours', {
            x: 250,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });
        page.drawText('Cost', {
            x: 400,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });

        // Header background
        page.drawRectangle({
            x: 40,
            y: yPosition - 5,
            width: 515,
            height: 20,
            color: primaryBlue,
        });

        // Redraw header text on top of blue background
        page.drawText('Date', {
            x: 50,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });
        page.drawText('Hours', {
            x: 250,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });
        page.drawText('Cost', {
            x: 400,
            y: yPosition,
            size: 10,
            font: boldFont,
            color: white,
        });

        yPosition -= 25;

        // Table rows
        sessions.slice(0, 10).forEach((session, index) => { // Limit to 10 sessions to avoid overflow
            let hours, dateStr;

            if (session.hours !== undefined) {
                hours = session.hours.toFixed(2);
                dateStr = new Date(session.date).toLocaleDateString('en-GB');
            } else if (session.startTime && session.endTime) {
                const start = new Date(session.startTime);
                const end = new Date(session.endTime);
                hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
                dateStr = start.toLocaleDateString('en-GB');
            } else {
                hours = '0.00';
                dateStr = 'Unknown';
            }

            const cost = (parseFloat(hours) * rate).toFixed(2);

            // Alternating row background
            if (index % 2 === 0) {
                page.drawRectangle({
                    x: 40,
                    y: yPosition - 5,
                    width: 515,
                    height: 18,
                    color: rgb(0.95, 0.95, 0.95),
                });
            }

            page.drawText(dateStr, {
                x: 50,
                y: yPosition,
                size: 9,
                font: regularFont,
                color: darkGray,
            });

            page.drawText(`${hours} hrs`, {
                x: 250,
                y: yPosition,
                size: 9,
                font: regularFont,
                color: darkGray,
            });

            page.drawText(`£${cost}`, {
                x: 400,
                y: yPosition,
                size: 9,
                font: regularFont,
                color: darkGray,
            });

            yPosition -= 20;
        });

        yPosition -= 10;
    }

    // Summary Section
    yPosition -= 30;

    // Line separator
    page.drawLine({
        start: { x: 350, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: lightGray,
    });

    yPosition -= 20;
    page.drawText('Total Hours:', {
        x: 350,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });
    page.drawText(`${totalHours.toFixed(2)} hrs`, {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    yPosition -= 18;
    page.drawText('Hourly Rate:', {
        x: 350,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });
    page.drawText(`£${rate.toFixed(2)}`, {
        x: width - 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
    });

    yPosition -= 10;
    page.drawLine({
        start: { x: 350, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: lightGray,
    });

    yPosition -= 20;
    page.drawText('Total Amount Due:', {
        x: 350,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: primaryBlue,
    });
    page.drawText(`£${totalCost.toFixed(2)}`, {
        x: width - 100,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: primaryBlue,
    });

    // Payment Information Box
    yPosition -= 50;

    if (settings && settings.bankName) {
        const boxWidth = width - 300;
        const boxHeight = 100;
        
        // Draw outer box
        page.drawRectangle({
            x: 50,
            y: yPosition - boxHeight,
            width: boxWidth,
            height: boxHeight,
            borderColor: primaryBlue,
            borderWidth: 1,
        });

        // Box header background
        page.drawRectangle({
            x: 50,
            y: yPosition - 25,
            width: boxWidth,
            height: 25,
            color: rgb(59 / 255, 130 / 255, 246 / 255, 0.1),
        });

        page.drawText('Payment Information', {
            x: 60,
            y: yPosition - 17,
            size: 11,
            font: boldFont,
            color: primaryBlue,
        });

        let paymentY = yPosition - 45;

        page.drawText('Please make payment to:', {
            x: 60,
            y: paymentY,
            size: 9,
            font: regularFont,
            color: darkGray,
        });

        paymentY -= 15;

        if (settings.accountName) {
            page.drawText('Account Name:', {
                x: 60,
                y: paymentY,
                size: 9,
                font: boldFont,
                color: darkGray,
            });
            page.drawText(settings.accountName, {
                x: 140,
                y: paymentY,
                size: 9,
                font: regularFont,
                color: darkGray,
            });
            paymentY -= 12;
        }

        if (settings.bankName) {
            page.drawText('Bank:', {
                x: 60,
                y: paymentY,
                size: 9,
                font: boldFont,
                color: darkGray,
            });
            page.drawText(settings.bankName, {
                x: 140,
                y: paymentY,
                size: 9,
                font: regularFont,
                color: darkGray,
            });
            paymentY -= 12;
        }

        if (settings.sortCode) {
            page.drawText('Sort Code:', {
                x: 60,
                y: paymentY,
                size: 9,
                font: boldFont,
                color: darkGray,
            });
            page.drawText(settings.sortCode, {
                x: 140,
                y: paymentY,
                size: 9,
                font: regularFont,
                color: darkGray,
            });
            paymentY -= 12;
        }

        if (settings.accountNumber) {
            page.drawText('Account Number:', {
                x: 60,
                y: paymentY,
                size: 9,
                font: boldFont,
                color: darkGray,
            });
            page.drawText(settings.accountNumber, {
                x: 140,
                y: paymentY,
                size: 9,
                font: regularFont,
                color: darkGray,
            });
            paymentY -= 12;
        }

        if (settings.paymentTermsNote) {
            page.drawText(settings.paymentTermsNote.slice(0, 80), {
                x: 60,
                y: paymentY - 5,
                size: 8,
                font: regularFont,
                color: lightGray,
                maxWidth: boxWidth - 20,
            });
        }

        yPosition -= 110;
    } else {
        // Fallback payment terms
        page.drawText('Payment Terms: Due within 7 days of invoice date', {
            x: 50,
            y: yPosition,
            size: 9,
            font: regularFont,
            color: lightGray,
        });
        yPosition -= 20;
    }

    // Thank you message
    yPosition -= 20;
    page.drawText('Thank you for your business!', {
        x: width / 2 - 70,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: lightGray,
    });

    // Footer
    page.drawText('This is a computer-generated invoice.', {
        x: width / 2 - 90,
        y: 30,
        size: 8,
        font: regularFont,
        color: lightGray,
    });

    // Save and return PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
