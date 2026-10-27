import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { COLORS, DECORATION, buildInvoiceModel } from './invoiceTemplate.js';

/**
 * Generate the childcare invoice PDF on the server.
 *
 * Draws the same document-style layout as lib/pdfGenerator.js — both render the
 * model from lib/invoiceTemplate.js, so the emailed PDF matches the preview.
 *
 * @param {Object} invoiceData
 * @param {Object} invoiceData.child - Child record with name, rate, email
 * @param {string} [invoiceData.monthName] - Billing period, e.g. "January 2026"
 * @param {number} invoiceData.totalHours
 * @param {number} invoiceData.rate - Hourly rate
 * @param {number} invoiceData.totalCost
 * @param {string} [invoiceData.recipientName] - Defaults to "Parent/Guardian of <child>"
 * @param {Object} [invoiceData.settings] - Business settings
 * @returns {Promise<Uint8Array>} - PDF bytes
 */

// The layout is authored in millimetres to match lib/pdfGenerator.js; pdf-lib
// works in points, so every measurement is scaled through MM.
const MM = 2.8346;
const PAGE_WIDTH = 595.28;   // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 24 * MM;
const MARGIN_RIGHT = PAGE_WIDTH - 24 * MM;
const TEXT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 4.8 * MM;
const PARAGRAPH_GAP = 5 * MM;
const BOTTOM_LIMIT = (297 - 20) * MM;

export async function generateInvoicePDF(invoiceData) {
    const model = buildInvoiceModel(invoiceData);

    const pdfDoc = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // y is the current baseline, measured down from the top of the page, as in
    // the jsPDF renderer; flip() converts to pdf-lib's bottom-up coordinates.
    let y = 0;
    const flip = (topY) => PAGE_HEIGHT - topY;

    const drawAt = (text, x, topY, { font = regular, size = BODY_SIZE, color = 'ink' } = {}) => {
        page.drawText(text, { x, y: flip(topY), size, font, color: toRgb(color) });
    };

    const drawRightAt = (text, rightX, topY, opts = {}) => {
        const { font = regular, size = BODY_SIZE } = opts;
        drawAt(text, rightX - font.widthOfTextAtSize(text, size), topY, opts);
    };

    const ensureSpace = (needed) => {
        if (y + needed > BOTTOM_LIMIT) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = 24 * MM;
        }
    };

    const drawLines = (lines, { step = LINE_HEIGHT, ...opts } = {}) => {
        ensureSpace(lines.length * step);
        lines.forEach((line) => {
            drawAt(line, MARGIN_LEFT, y, opts);
            y += step;
        });
    };

    // ===== Decorative motif, centred =====
    drawDecoration(page, PAGE_WIDTH / 2, flip(22 * MM));

    // ===== Title =====
    page.drawText(model.title, {
        x: PAGE_WIDTH / 2 - bold.widthOfTextAtSize(model.title, 16) / 2,
        y: flip(36 * MM),
        size: 16,
        font: bold,
        color: toRgb('ink'),
    });

    // ===== To / Date =====
    y = 50 * MM;
    drawAt(model.recipientLabel, MARGIN_LEFT, y);
    drawRightAt(model.dateLabel, MARGIN_RIGHT, y);

    // ===== Billing period =====
    y += 8 * MM;
    drawAt(model.periodLabel, MARGIN_LEFT, y);

    // ===== Charges =====
    y += 13 * MM;
    drawAt(model.chargeLabel, MARGIN_LEFT + 10 * MM, y);
    drawAt(model.amountLabel, MARGIN_LEFT + 86 * MM, y);

    y += 10 * MM;
    drawAt(model.totalLabel, MARGIN_LEFT + 28 * MM, y);
    drawAt(model.amountLabel, MARGIN_LEFT + 86 * MM, y);

    // ===== Notes =====
    y += 14 * MM;
    model.notes.forEach((note) => {
        drawLines(wrapText(note, regular, BODY_SIZE, TEXT_WIDTH));
        y += PARAGRAPH_GAP;
    });

    // ===== Sign-off =====
    y += 4 * MM;
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
    if (model.unavailable.dates.length === 0) return pdfDoc.save();

    // ===== Dashed divider =====
    y += 8 * MM;
    ensureSpace(6 * MM);
    page.drawLine({
        start: { x: MARGIN_LEFT, y: flip(y) },
        end: { x: MARGIN_RIGHT, y: flip(y) },
        thickness: 0.7,
        color: toRgb('ink'),
        dashArray: [3, 3],
    });

    // ===== Unavailable dates =====
    y += 12 * MM;
    ensureSpace(10 * MM);

    const headingSize = 12.5;
    page.drawRectangle({
        x: MARGIN_LEFT - 1 * MM,
        y: flip(y) - 1.6 * MM,
        width: bold.widthOfTextAtSize(model.unavailable.heading, headingSize) + 3 * MM,
        height: 5.6 * MM,
        color: toRgb('highlight'),
    });
    drawAt(model.unavailable.heading, MARGIN_LEFT, y, { font: bold, size: headingSize });

    y += 12 * MM;
    model.unavailable.dates.forEach((dateRange) => {
        drawLines(wrapText(dateRange, bold, 13, TEXT_WIDTH), {
            step: 6.5 * MM,
            font: bold,
            size: 13,
            color: 'accentRed',
        });
        y += 4 * MM;
    });

    return pdfDoc.save();
}

function toRgb(name) {
    const [r, g, b] = COLORS[name];
    return rgb(r / 255, g / 255, b / 255);
}

/** Greedy word wrap — pdf-lib measures text but does not lay it out. */
function wrapText(text, font, size, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
            current = candidate;
        } else {
            lines.push(current);
            current = word;
        }
    });

    if (current) lines.push(current);
    return lines;
}

/** Draw the shared motif. cy is already in pdf-lib's bottom-up space, so dy flips. */
function drawDecoration(page, cx, cy) {
    DECORATION.forEach((part) => {
        const x = cx + part.dx * MM;
        const y = cy - part.dy * MM;
        const color = toRgb(part.color);

        if (part.shape === 'circle') {
            page.drawCircle({ x, y, size: part.r * MM, color });
        } else {
            page.drawEllipse({ x, y, xScale: part.rx * MM, yScale: part.ry * MM, color });
        }
    });
}
