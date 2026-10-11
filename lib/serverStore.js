import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDatabase() {
    await sql`
        CREATE TABLE IF NOT EXISTS children (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            rate DECIMAL(10,2) DEFAULT 0,
            email VARCHAR(255) DEFAULT '',
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            date VARCHAR(10) NOT NULL,
            hours DECIMAL(10,2),
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            is_auto BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            business_name VARCHAR(255),
            business_email VARCHAR(255),
            bank_name VARCHAR(255),
            account_name VARCHAR(255),
            sort_code VARCHAR(20),
            account_number VARCHAR(20),
            payment_terms_note TEXT,
            provider_name VARCHAR(255),
            business_address TEXT,
            registration_number VARCHAR(50),
            unavailable_dates TEXT,
            absence_note TEXT,
            feedback_note TEXT,
            financial_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Settings columns added with the invoice redesign — existing databases
    // already have a settings table, so CREATE TABLE IF NOT EXISTS skips them.
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255)`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_address TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50)`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS unavailable_dates TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS absence_note TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS feedback_note TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS financial_note TEXT`;

    // Enough detail per invoice to rebuild the exact PDF later, so a past
    // invoice can be downloaded or re-sent rather than only listed.
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10,2)`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2)`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS settings_snapshot TEXT`;

    await sql`
        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            child_name VARCHAR(255) NOT NULL,
            parent_email VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            period VARCHAR(50) NOT NULL,
            date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'Sent',
            total_hours DECIMAL(10,2),
            hourly_rate DECIMAL(10,2),
            invoice_date TIMESTAMP,
            settings_snapshot TEXT
        )
    `;
}

// === Children ===
export const getDashboardData = async () => {
    try {
        const todayStr = new Date().toISOString().slice(0, 10);
        
        // Optimize: Fetch children with aggregated total hours and today's status in one query
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
    } catch (error) {
        console.error('[serverStore.getDashboardData] Error:', error);
        return [];
    }
};

export const getChildren = async () => {
    try {
        const { rows } = await sql`SELECT * FROM children ORDER BY name`;
        return rows;
    } catch (error) {
        console.error('[serverStore.getChildren] Error:', error);
        return [];
    }
};

export const saveChild = async (child) => {
    console.log("1. Starting saveChild...", child);
    try {
        if (child.id) {
            // Update existing child
            const { rows } = await sql`
                UPDATE children
                SET name = ${child.name}, rate = ${child.rate || 0}, email = ${child.email || ''}, active = ${child.active !== false}
                WHERE id = ${child.id}
                RETURNING *
            `;
            console.log("2. Updated existing child");
            return { success: true, child: rows[0] };
        } else {
            // Create new child
            const { rows } = await sql`
                INSERT INTO children (name, rate, email, active)
                VALUES (${child.name}, ${child.rate || 0}, ${child.email || ''}, ${child.active !== false})
                RETURNING *
            `;
            console.log("2. Created new child");
            return { success: true, child: rows[0] };
        }
    } catch (error) {
        console.error("CRITICAL SAVE CHILD ERROR:", error);
        throw error;
    }
};

export const getChild = async (id) => {
    try {
        const { rows } = await sql`SELECT * FROM children WHERE id = ${id}`;
        return rows[0] || null;
    } catch (error) {
        console.error('[serverStore.getChild] Error:', error);
        return null;
    }
};

export const deleteChild = async (id) => {
    try {
        // Attendance and invoices reference children with ON DELETE CASCADE,
        // so this also removes the child's full history.
        await sql`DELETE FROM children WHERE id = ${id}`;
        return { success: true };
    } catch (error) {
        console.error('[serverStore.deleteChild] Error:', error);
        throw error;
    }
};

// === Attendance ===
export const getAttendance = async () => {
    try {
        const { rows } = await sql`SELECT * FROM attendance ORDER BY date DESC, start_time DESC`;
        return rows.map(row => ({
            id: row.id,
            childId: row.child_id,
            date: row.date,
            hours: row.hours ? parseFloat(row.hours) : null,
            startTime: row.start_time?.toISOString(),
            endTime: row.end_time?.toISOString(),
            isAuto: row.is_auto
        }));
    } catch (error) {
        console.error('[serverStore.getAttendance] Error:', error);
        return [];
    }
};

export const saveAttendance = async (attendance) => {
    console.log("1. Starting saveAttendance... count:", attendance?.length);
    try {
        // This function is for compatibility but not recommended
        // Better to use logHours or specific attendance functions
        console.log("Warning: saveAttendance is not fully implemented for Postgres");
        return { success: true };
    } catch (error) {
        console.error("CRITICAL SAVE ATTENDANCE ERROR:", error);
        throw error;
    }
};

export const getTodayHours = async (childId) => {
    try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { rows } = await sql`
            SELECT hours FROM attendance
            WHERE child_id = ${childId} AND date = ${todayStr}
        `;
        return rows.length > 0 ? parseFloat(rows[0].hours) : null;
    } catch (error) {
        console.error('[serverStore.getTodayHours] Error:', error);
        return null;
    }
};

export const logHours = async (childId, hours, date = null) => {
    try {
        const dateStr = date || new Date().toISOString().slice(0, 10);

        // Check if record exists
        const { rows: existing } = await sql`
            SELECT id FROM attendance
            WHERE child_id = ${childId} AND date = ${dateStr}
        `;

        if (existing.length > 0) {
            // Update existing
            await sql`
                UPDATE attendance
                SET hours = ${hours}
                WHERE child_id = ${childId} AND date = ${dateStr}
            `;
        } else {
            // Insert new
            await sql`
                INSERT INTO attendance (child_id, date, hours, is_auto)
                VALUES (${childId}, ${dateStr}, ${hours}, false)
            `;
        }

        return { success: true };
    } catch (error) {
        console.error('[serverStore.logHours] Error:', error);
        throw error;
    }
};

export const deleteAttendance = async (recordId) => {
    try {
        await sql`DELETE FROM attendance WHERE id = ${recordId}`;
        return { success: true };
    } catch (error) {
        console.error('[serverStore.deleteAttendance] Error:', error);
        throw error;
    }
};

export const getTotalHoursForChild = async (childId) => {
    try {
        const { rows } = await sql`
            SELECT
                COALESCE(SUM(hours), 0) as hours_total,
                COALESCE(SUM(
                    CASE
                        WHEN end_time IS NOT NULL AND start_time IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
                        ELSE 0
                    END
                ), 0) as time_total
            FROM attendance
            WHERE child_id = ${childId}
        `;

        const hoursTotal = parseFloat(rows[0].hours_total) || 0;
        const timeTotal = parseFloat(rows[0].time_total) || 0;
        return hoursTotal + timeTotal;
    } catch (error) {
        console.error('[serverStore.getTotalHoursForChild] Error:', error);
        return 0;
    }
};

export const updateAttendance = async (updatedRecord) => {
    try {
        await sql`
            UPDATE attendance
            SET child_id = ${updatedRecord.childId},
                date = ${updatedRecord.date || null},
                hours = ${updatedRecord.hours || null},
                start_time = ${updatedRecord.startTime ? new Date(updatedRecord.startTime) : null},
                end_time = ${updatedRecord.endTime ? new Date(updatedRecord.endTime) : null},
                is_auto = ${updatedRecord.isAuto || false}
            WHERE id = ${updatedRecord.id}
        `;
        return { success: true };
    } catch (error) {
        console.error('[serverStore.updateAttendance] Error:', error);
        throw error;
    }
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

export const getSettings = async () => {
    try {
        const { rows } = await sql`SELECT * FROM settings LIMIT 1`;
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
    } catch (error) {
        console.error('[serverStore.getSettings] Error:', error);
        return getDefaultSettings();
    }
};

export const saveSettings = async (settings) => {
    try {
        // Check if settings exist
        const { rows: existing } = await sql`SELECT id FROM settings LIMIT 1`;

        if (existing.length > 0) {
            // Update existing
            await sql`
                UPDATE settings SET
                    business_name = ${settings.businessName || ''},
                    business_email = ${settings.businessEmail || ''},
                    bank_name = ${settings.bankName || ''},
                    account_name = ${settings.accountName || ''},
                    sort_code = ${settings.sortCode || ''},
                    account_number = ${settings.accountNumber || ''},
                    payment_terms_note = ${settings.paymentTermsNote || ''},
                    provider_name = ${settings.providerName || ''},
                    business_address = ${settings.businessAddress || ''},
                    registration_number = ${settings.registrationNumber || ''},
                    unavailable_dates = ${settings.unavailableDates || ''},
                    absence_note = ${settings.absenceNote || ''},
                    feedback_note = ${settings.feedbackNote || ''},
                    financial_note = ${settings.financialNote || ''},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
            `;
        } else {
            // Insert new
            await sql`
                INSERT INTO settings (
                    business_name, business_email, bank_name, account_name, sort_code,
                    account_number, payment_terms_note, provider_name, business_address,
                    registration_number, unavailable_dates, absence_note, feedback_note,
                    financial_note
                )
                VALUES (
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
            `;
        }

        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveSettings] Error:', error);
        throw error;
    }
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

export const getInvoices = async () => {
    try {
        const { rows } = await sql`
            SELECT * FROM invoices
            ORDER BY date_sent DESC
        `;
        return rows.map(mapInvoice);
    } catch (error) {
        console.error('[serverStore.getInvoices] Error:', error);
        return [];
    }
};

export const getInvoice = async (id) => {
    try {
        const { rows } = await sql`SELECT * FROM invoices WHERE id = ${id}`;
        return rows[0] ? mapInvoice(rows[0]) : null;
    } catch (error) {
        console.error('[serverStore.getInvoice] Error:', error);
        return null;
    }
};

export const updateInvoiceStatus = async (id, status) => {
    try {
        const { rows } = await sql`
            UPDATE invoices SET status = ${status} WHERE id = ${id} RETURNING *
        `;
        return rows[0] ? mapInvoice(rows[0]) : null;
    } catch (error) {
        console.error('[serverStore.updateInvoiceStatus] Error:', error);
        throw error;
    }
};

export const deleteInvoice = async (id) => {
    try {
        const { rowCount } = await sql`DELETE FROM invoices WHERE id = ${id}`;
        return rowCount > 0;
    } catch (error) {
        console.error('[serverStore.deleteInvoice] Error:', error);
        throw error;
    }
};

export const logInvoice = async (invoice) => {
    try {
        const snapshot = invoice.settings ? JSON.stringify(invoice.settings) : null;
        const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();

        const { rows } = await sql`
            INSERT INTO invoices (
                child_id, child_name, parent_email, amount, period, status,
                total_hours, hourly_rate, invoice_date, settings_snapshot
            )
            VALUES (
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
    } catch (error) {
        console.error('[serverStore.logInvoice] Error:', error);
        throw error;
    }
};
