/**
 * Shared content model for the childcare invoice document.
 *
 * The invoice is rendered twice — once in the browser with jsPDF
 * (lib/pdfGenerator.js, for the preview modal and download) and once on the
 * server with pdf-lib (lib/serverPdfGenerator.js, for the assistant's
 * sendInvoice tool). Both draw from the model built here so the two outputs
 * never drift apart in content.
 */

// Fresh Garden palette, plus the two document accents (RGB 0-255)
export const COLORS = {
    leaf: [61, 133, 88],
    leafDeep: [42, 90, 64],
    honey: [242, 223, 158],
    ink: [28, 32, 29],
    inkSoft: [92, 110, 99],
    highlight: [252, 231, 122],
    accentRed: [176, 42, 49],
};

// Note paragraphs. Used when the matching setting is left blank.
export const DEFAULT_NOTES = {
    absence: 'Please note all absences will be charged at your normal contracted hourly/ daily rate. This will include Sickness, pre-booked days, Snow days & Holidays without six weeks written notice.',
    feedback: 'If you have any concerns or suggestions that may improve my childcare setting, please feel free to discuss them with me at any time.',
    financial: 'If you are experiencing financial difficulties, please do not hesitate to contact me.',
};

/**
 * The little decorative motif centred above the title — a butterfly built from
 * plain circles so both PDF libraries can draw it without an image asset.
 *
 * Offsets are in template units (1 unit = 1mm) from the motif's centre, with
 * dy positive downwards. Each renderer scales and flips to suit its own
 * coordinate system. Order is paint order: wings first, body over the top.
 */
export const DECORATION = [
    { shape: 'circle', dx: -3.6, dy: -1.9, r: 2.8, color: 'leaf' },
    { shape: 'circle', dx: 3.6, dy: -1.9, r: 2.8, color: 'leaf' },
    { shape: 'circle', dx: -2.9, dy: 2.1, r: 2.2, color: 'honey' },
    { shape: 'circle', dx: 2.9, dy: 2.1, r: 2.2, color: 'honey' },
    { shape: 'ellipse', dx: 0, dy: 0.1, rx: 0.95, ry: 3.1, color: 'leafDeep' },
    { shape: 'circle', dx: -1.5, dy: -4, r: 0.5, color: 'leafDeep' },
    { shape: 'circle', dx: 1.5, dy: -4, r: 0.5, color: 'leafDeep' },
];

/** Split a multi-line setting (address, unavailable dates) into trimmed lines. */
export function splitLines(value) {
    if (!value) return [];
    return String(value)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

/** "56" rather than "56.00", but "5.5" keeps its half hour. */
function formatHours(hours) {
    return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
}

function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatPeriod(date) {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/**
 * Normalise either call site's invoice data into the flat model the renderers
 * draw. Accepts the client shape ({ childName, hourlyRate, ... }) and the
 * server shape ({ child, rate, totalCost, monthName, ... }).
 *
 * @param {Object} input
 * @param {string} [input.childName] - Child's name (or pass input.child)
 * @param {Object} [input.child] - Child record, used for name/rate fallbacks
 * @param {string} [input.recipientName] - Who the invoice is addressed to
 * @param {number|string} [input.totalHours] - Hours billed
 * @param {number|string} [input.hourlyRate] - Rate (server shape: input.rate)
 * @param {number|string} [input.totalCost] - Amount, else hours x rate
 * @param {string|Date} [input.invoiceDate] - Invoice date, defaults to today
 * @param {string} [input.periodLabel] - Billing period (server: input.monthName)
 * @param {Object} [input.settings] - Business settings
 * @returns {Object} Flat view model
 */
export function buildInvoiceModel(input = {}) {
    const settings = input.settings || {};
    const child = input.child || {};

    // Postgres DECIMAL columns arrive as strings — coerce everything numeric
    const hours = Number(input.totalHours) || 0;
    const rate = Number(input.hourlyRate ?? input.rate ?? child.rate) || 0;
    const amount = input.totalCost === undefined || input.totalCost === null
        ? hours * rate
        : Number(input.totalCost) || 0;

    const childName = input.childName || child.name || '';
    const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();

    const businessName = settings.businessName || 'Childcare';

    // A named recipient is used as-is; without one the invoice addresses the
    // child's parent and the email greeting stays generic.
    const namedRecipient = input.recipientName || input.parentName || child.parentName || '';
    const recipientName = namedRecipient
        || (childName ? `Parent/Guardian of ${childName}` : 'Parent/Guardian');

    const notes = [
        settings.absenceNote || DEFAULT_NOTES.absence,
        settings.feedbackNote || DEFAULT_NOTES.feedback,
        settings.financialNote || DEFAULT_NOTES.financial,
    ].filter(Boolean);

    const registrationNumber = settings.registrationNumber || '';

    return {
        childName,
        title: `${businessName} Invoice`,
        recipientLabel: `To: ${recipientName}`,
        greetingName: namedRecipient || 'Parent/Guardian',
        periodName: input.periodLabel || input.monthName || formatPeriod(invoiceDate),
        dateLabel: `Date: ${formatDate(invoiceDate)}`,
        periodLabel: `Childcare costs for the month of ${input.periodLabel || input.monthName || formatPeriod(invoiceDate)}`,
        chargeLabel: `${formatHours(hours)} Hours \u00A3${rate.toFixed(2)} per hour`,
        amountLabel: `\u00A3${amount.toFixed(2)}`,
        totalLabel: 'TOTAL',
        notes,
        signOff: {
            greeting: 'Kind regards',
            providerName: settings.providerName || settings.accountName || settings.businessName || '',
            addressLines: splitLines(settings.businessAddress),
            registrationLine: registrationNumber
                ? `Ofsted registration number ${registrationNumber}`
                : '',
        },
        unavailable: {
            heading: 'Unavailable dates for this year',
            dates: splitLines(settings.unavailableDates),
        },
    };
}

/** File name used for the download and the email attachment. */
export function invoiceFileName(childName) {
    const safeName = (childName || 'Invoice').replace(/\s+/g, '_');
    return `Invoice_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
}
