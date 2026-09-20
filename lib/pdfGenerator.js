import { jsPDF } from 'jspdf';
import { COLORS, DECORATION, buildInvoiceModel, invoiceFileName } from './invoiceTemplate.js';

/**
 * Generate the childcare invoice PDF in the browser.
 *
 * A plain, document-style A4 page: decorative motif and title, the To/Date and
 * billing-period rows, a single charges line, the note paragraphs, the sign-off
 * block, then a dashed rule and the unavailable dates.
 *
 * @param {Object} invoiceData
 * @param {string} invoiceData.childName
 * @param {string} [invoiceData.recipientName] - Defaults to "Parent/Guardian of <child>"
 * @param {string} [invoiceData.parentEmail]
 * @param {number} invoiceData.totalHours
 * @param {number} invoiceData.hourlyRate
 * @param {string} [invoiceData.periodLabel] - e.g. "August 2026"
 * @param {string|Date} [invoiceData.invoiceDate]
 * @param {Object} [invoiceData.settings] - Business settings
 * @returns {Object} - { pdfBlob, pdfDataUri, fileName }
 */

// A4 portrait, millimetres
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 24;
const MARGIN_RIGHT = PAGE_WIDTH - 24;
const TEXT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 4.8;
const PARAGRAPH_GAP = 5;
const BOTTOM_LIMIT = PAGE_HEIGHT - 20;

export function generateInvoicePDF(invoiceData) {
    const model = buildInvoiceModel(invoiceData);
    const doc = new jsPDF();

    const setBody = () => {
        doc.setFont('times', 'normal');
        doc.setFontSize(BODY_SIZE);
        doc.setTextColor(...COLORS.ink);
    };

    // y is the current baseline, measured down from the top of the page.
    let y = 0;

    // Start a fresh page when the next block would run past the bottom margin
    const ensureSpace = (needed) => {
        if (y + needed > BOTTOM_LIMIT) {
            doc.addPage();
            y = 24;
        }
    };

    // Draw wrapped lines one at a time so the cursor stays authoritative,
    // rather than letting jsPDF apply its own line-height factor.
    const drawLines = (lines, { x = MARGIN_LEFT, step = LINE_HEIGHT } = {}) => {
        ensureSpace(lines.length * step);
        lines.forEach((line) => {
            doc.text(line, x, y);
            y += step;
        });
    };

    // ===== Decorative motif, centred =====
    drawDecoration(doc, PAGE_WIDTH / 2, 22);

    // ===== Title =====
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.ink);
    doc.text(model.title, PAGE_WIDTH / 2, 36, { align: 'center' });

    // ===== To / Date =====
    y = 50;
    setBody();
    doc.text(model.recipientLabel, MARGIN_LEFT, y);
    doc.text(model.dateLabel, MARGIN_RIGHT, y, { align: 'right' });

    // ===== Billing period =====
    y += 8;
    doc.text(model.periodIntro, MARGIN_LEFT, y);
    doc.text(model.periodLabel, MARGIN_RIGHT, y, { align: 'right' });

    // ===== Charges =====
    y += 13;
    doc.text(model.chargeLabel, MARGIN_LEFT + 10, y);
    doc.text(model.amountLabel, MARGIN_LEFT + 86, y);

    y += 10;
    doc.text(model.totalLabel, MARGIN_LEFT + 28, y);
    doc.text(model.amountLabel, MARGIN_LEFT + 86, y);

    // ===== Notes =====
    y += 14;
    model.notes.forEach((note) => {
        drawLines(doc.splitTextToSize(note, TEXT_WIDTH));
        y += PARAGRAPH_GAP;
    });

    // ===== Sign-off =====
    y += 4;
    const signOffLines = [model.signOff.greeting];
    if (model.signOff.providerName) signOffLines.push(`${model.signOff.providerName}.`);
    drawLines(signOffLines);

    if (model.signOff.addressLines.length > 0) {
        y += PARAGRAPH_GAP;
        drawLines(model.signOff.addressLines);
    }

    if (model.signOff.registrationLine) {
        y += PARAGRAPH_GAP;
        drawLines([model.signOff.registrationLine]);
    }

    // Nothing below the rule when no unavailable dates are set, so the
    // document simply ends with the sign-off.
    if (model.unavailable.dates.length === 0) {
        return {
            pdfBlob: doc.output('blob'),
            pdfDataUri: doc.output('dataurlstring'),
            fileName: invoiceFileName(model.childName),
        };
    }

    // ===== Dashed divider =====
    y += 8;
    ensureSpace(6);
    doc.setDrawColor(...COLORS.ink);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1.1, 1.1], 0);
    doc.line(MARGIN_LEFT, y, MARGIN_RIGHT, y);
    doc.setLineDashPattern([], 0);

    // ===== Unavailable dates =====
    y += 12;
    ensureSpace(10);

    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.setFillColor(...COLORS.highlight);
    doc.rect(MARGIN_LEFT - 1, y - 4, doc.getTextWidth(model.unavailable.heading) + 3, 5.6, 'F');
    doc.setTextColor(...COLORS.ink);
    doc.text(model.unavailable.heading, MARGIN_LEFT, y);

    y += 12;
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.accentRed);
    model.unavailable.dates.forEach((dateRange) => {
        drawLines(doc.splitTextToSize(dateRange, TEXT_WIDTH), { step: 6.5 });
        y += 4;
    });

    return {
        pdfBlob: doc.output('blob'),
        pdfDataUri: doc.output('dataurlstring'),
        fileName: invoiceFileName(model.childName),
    };
}

/** Draw the shared motif, centred on (cx, cy). jsPDF y grows downwards. */
function drawDecoration(doc, cx, cy) {
    DECORATION.forEach((part) => {
        doc.setFillColor(...COLORS[part.color]);
        if (part.shape === 'circle') {
            doc.circle(cx + part.dx, cy + part.dy, part.r, 'F');
        } else {
            doc.ellipse(cx + part.dx, cy + part.dy, part.rx, part.ry, 'F');
        }
    });
}
