import { sql } from '@vercel/postgres';
import { NotFoundError } from '@/lib/errors';

// Every function takes the signed-in user's id first and only reads or
// changes that user's rows. Attendance has no user_id of its own: it belongs
// to whoever owns its child, so attendance queries join through children.

/** Throws NotFoundError unless the child exists and belongs to the user. */
async function assertChildOwned(userId, childId) {
    const { rows } = await sql`SELECT id FROM children WHERE id = ${childId} AND user_id = ${userId}`;
    if (rows.length === 0) throw new NotFoundError('Child not found');
}

// === Children ===
export const getDashboardData = async (userId) => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Children with aggregated total hours and today's status in one query
    const { rows } = await sql`
        SELECT
            c.id,
            c.name,
            c.rate,
            c.email,
            c.active,
            (SELECT COALESCE(SUM(hours), 0) FROM attendance WHERE child_id = c.id) as total_hours,
            (
                SELECT json_build_object(
                    'id', a.id,
                    'hours', a.hours,
                    'isAuto', a.is_auto,
                    'date', a.date
                )
                FROM attendance a
                WHERE a.child_id = c.id AND a.date = ${todayStr}
            ) as today_record
        FROM children c
        WHERE c.user_id = ${userId}
        ORDER BY c.name
    `;

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        rate: row.rate ? parseFloat(row.rate) : 0,
        email: row.email,
        active: row.active,
        totalHours: row.total_hours ? parseFloat(row.total_hours) : 0,
        todayRecord: row.today_record || null
    }));
};

export const getChildren = async (userId) => {
    const { rows } = await sql`SELECT * FROM children WHERE user_id = ${userId} ORDER BY name`;
    return rows;
};

export const saveChild = async (userId, child) => {
    if (child.id) {
        const { rows } = await sql`
            UPDATE children
            SET name = ${child.name}, rate = ${child.rate || 0}, email = ${child.email || ''}, active = ${child.active !== false}
            WHERE id = ${child.id} AND user_id = ${userId}
            RETURNING *
        `;
        if (rows.length === 0) throw new NotFoundError('Child not found');
        return { success: true, child: rows[0] };
    }

    const { rows } = await sql`
        INSERT INTO children (user_id, name, rate, email, active)
        VALUES (${userId}, ${child.name}, ${child.rate || 0}, ${child.email || ''}, ${child.active !== false})
        RETURNING *
    `;
    return { success: true, child: rows[0] };
};

export const getChild = async (userId, id) => {
    const { rows } = await sql`SELECT * FROM children WHERE id = ${id} AND user_id = ${userId}`;
    return rows[0] || null;
};

/** Returns false when the child does not exist or is not the user's. */
export const deleteChild = async (userId, id) => {
    // Attendance and invoices reference children with ON DELETE CASCADE,
    // so this also removes the child's full history.
    const { rowCount } = await sql`DELETE FROM children WHERE id = ${id} AND user_id = ${userId}`;
    return rowCount > 0;
};

// === Attendance ===
export const getAttendance = async (userId) => {
    const { rows } = await sql`
        SELECT a.*
        FROM attendance a
        JOIN children c ON c.id = a.child_id
        WHERE c.user_id = ${userId}
        ORDER BY a.date DESC, a.start_time DESC
    `;
    return rows.map(row => ({
        id: row.id,
        childId: row.child_id,
        date: row.date,
        hours: row.hours ? parseFloat(row.hours) : null,
        startTime: row.start_time?.toISOString(),
        endTime: row.end_time?.toISOString(),
        isAuto: row.is_auto
    }));
};

export const logHours = async (userId, childId, hours, date = null) => {
    await assertChildOwned(userId, childId);
    const dateStr = date || new Date().toISOString().slice(0, 10);

    const { rows: existing } = await sql`
        SELECT id FROM attendance
        WHERE child_id = ${childId} AND date = ${dateStr}
    `;

    if (existing.length > 0) {
        await sql`
            UPDATE attendance
            SET hours = ${hours}
            WHERE child_id = ${childId} AND date = ${dateStr}
        `;
    } else {
        await sql`
            INSERT INTO attendance (child_id, date, hours, is_auto)
            VALUES (${childId}, ${dateStr}, ${hours}, false)
        `;
    }

    return { success: true };
};

/** Returns false when the record does not exist or is not the user's. */
export const deleteAttendance = async (userId, recordId) => {
    const { rowCount } = await sql`
        DELETE FROM attendance a
        USING children c
        WHERE a.id = ${recordId} AND a.child_id = c.id AND c.user_id = ${userId}
    `;
    return rowCount > 0;
};

export const getTotalHoursForChild = async (userId, childId) => {
    const { rows } = await sql`
        SELECT
            COALESCE(SUM(a.hours), 0) as hours_total,
            COALESCE(SUM(
                CASE
                    WHEN a.end_time IS NOT NULL AND a.start_time IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 3600
                    ELSE 0
                END
            ), 0) as time_total
        FROM attendance a
        JOIN children c ON c.id = a.child_id
        WHERE a.child_id = ${childId} AND c.user_id = ${userId}
    `;

    const hoursTotal = parseFloat(rows[0].hours_total) || 0;
    const timeTotal = parseFloat(rows[0].time_total) || 0;
    return hoursTotal + timeTotal;
};

/**
 * Update one attendance record. Both the record and the child it ends up on
 * must belong to the user, so a record cannot be moved between accounts.
 */
export const updateAttendance = async (userId, updatedRecord) => {
    await assertChildOwned(userId, updatedRecord.childId);
    const { rowCount } = await sql`
        UPDATE attendance a
        SET child_id = ${updatedRecord.childId},
            date = ${updatedRecord.date || null},
            hours = ${updatedRecord.hours || null},
            start_time = ${updatedRecord.startTime ? new Date(updatedRecord.startTime) : null},
            end_time = ${updatedRecord.endTime ? new Date(updatedRecord.endTime) : null},
            is_auto = ${updatedRecord.isAuto || false}
        FROM children c
        WHERE a.id = ${updatedRecord.id} AND a.child_id = c.id AND c.user_id = ${userId}
    `;
    if (rowCount === 0) throw new NotFoundError('Record not found');
    return { success: true };
};

// === Settings ===
const getDefaultSettings = () => ({
    businessName: '',
    businessEmail: '',
    bankName: '',
    accountName: '',
    sortCode: '',
    accountNumber: '',
    paymentTermsNote: '',
    // Shown on the invoice document
    providerName: '',
    businessAddress: '',
    registrationNumber: '',
    unavailableDates: '',
    absenceNote: '',
    feedbackNote: '',
    financialNote: '',
});

export const getSettings = async (userId) => {
    const { rows } = await sql`SELECT * FROM settings WHERE user_id = ${userId}`;
    if (rows.length === 0) {
        return getDefaultSettings();
    }
    return {
        businessName: rows[0].business_name || '',
        businessEmail: rows[0].business_email || '',
        bankName: rows[0].bank_name || '',
        accountName: rows[0].account_name || '',
        sortCode: rows[0].sort_code || '',
        accountNumber: rows[0].account_number || '',
        paymentTermsNote: rows[0].payment_terms_note || '',
        providerName: rows[0].provider_name || '',
        businessAddress: rows[0].business_address || '',
        registrationNumber: rows[0].registration_number || '',
        unavailableDates: rows[0].unavailable_dates || '',
        absenceNote: rows[0].absence_note || '',
        feedbackNote: rows[0].feedback_note || '',
        financialNote: rows[0].financial_note || '',
    };
};

export const saveSettings = async (userId, settings) => {
    // settings_user_id_key makes user_id unique, so this is one row per user
    await sql`
        INSERT INTO settings (
            user_id, business_name, business_email, bank_name, account_name, sort_code,
            account_number, payment_terms_note, provider_name, business_address,
            registration_number, unavailable_dates, absence_note, feedback_note,
            financial_note
        )
        VALUES (
            ${userId},
            ${settings.businessName || ''},
            ${settings.businessEmail || ''},
            ${settings.bankName || ''},
            ${settings.accountName || ''},
            ${settings.sortCode || ''},
            ${settings.accountNumber || ''},
            ${settings.paymentTermsNote || ''},
            ${settings.providerName || ''},
            ${settings.businessAddress || ''},
            ${settings.registrationNumber || ''},
            ${settings.unavailableDates || ''},
            ${settings.absenceNote || ''},
            ${settings.feedbackNote || ''},
            ${settings.financialNote || ''}
        )
        ON CONFLICT (user_id) DO UPDATE SET
            business_name = EXCLUDED.business_name,
            business_email = EXCLUDED.business_email,
            bank_name = EXCLUDED.bank_name,
            account_name = EXCLUDED.account_name,
            sort_code = EXCLUDED.sort_code,
            account_number = EXCLUDED.account_number,
            payment_terms_note = EXCLUDED.payment_terms_note,
            provider_name = EXCLUDED.provider_name,
            business_address = EXCLUDED.business_address,
            registration_number = EXCLUDED.registration_number,
            unavailable_dates = EXCLUDED.unavailable_dates,
            absence_note = EXCLUDED.absence_note,
            feedback_note = EXCLUDED.feedback_note,
            financial_note = EXCLUDED.financial_note,
            updated_at = NOW()
    `;
    return { success: true };
};

// === Invoices ===
const parseSnapshot = (value) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        // A snapshot we cannot read should not break the history list
        return null;
    }
};

const toNumberOrNull = (value) => (value === null || value === undefined ? null : parseFloat(value));

const mapInvoice = (row) => ({
    id: row.id,
    childId: row.child_id,
    childName: row.child_name,
    parentEmail: row.parent_email,
    amount: parseFloat(row.amount),
    period: row.period,
    dateSent: row.date_sent?.toISOString(),
    status: row.status,
    // Present only for invoices sent after the rebuild support was added
    totalHours: toNumberOrNull(row.total_hours),
    hourlyRate: toNumberOrNull(row.hourly_rate),
    invoiceDate: row.invoice_date?.toISOString() || row.date_sent?.toISOString(),
    settingsSnapshot: parseSnapshot(row.settings_snapshot),
});

export const getInvoices = async (userId) => {
    const { rows } = await sql`
        SELECT * FROM invoices
        WHERE user_id = ${userId}
        ORDER BY date_sent DESC
    `;
    return rows.map(mapInvoice);
};

export const getInvoice = async (userId, id) => {
    const { rows } = await sql`SELECT * FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
    return rows[0] ? mapInvoice(rows[0]) : null;
};

export const updateInvoiceStatus = async (userId, id, status) => {
    const { rows } = await sql`
        UPDATE invoices SET status = ${status}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
    `;
    return rows[0] ? mapInvoice(rows[0]) : null;
};

/** Returns false when the invoice does not exist or is not the user's. */
export const deleteInvoice = async (userId, id) => {
    const { rowCount } = await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
    return rowCount > 0;
};

export const logInvoice = async (userId, invoice) => {
    await assertChildOwned(userId, invoice.childId);
    const snapshot = invoice.settings ? JSON.stringify(invoice.settings) : null;
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();

    const { rows } = await sql`
        INSERT INTO invoices (
            user_id, child_id, child_name, parent_email, amount, period, status,
            total_hours, hourly_rate, invoice_date, settings_snapshot
        )
        VALUES (
            ${userId},
            ${invoice.childId},
            ${invoice.childName},
            ${invoice.parentEmail},
            ${invoice.amount},
            ${invoice.period},
            'Sent',
            ${invoice.totalHours ?? null},
            ${invoice.hourlyRate ?? null},
            ${invoiceDate},
            ${snapshot}
        )
        RETURNING *
    `;
    return mapInvoice(rows[0]);
};
