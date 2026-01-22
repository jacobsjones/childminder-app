import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDatabase() {
    await sql`
        CREATE TABLE IF NOT EXISTS children (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            rate DECIMAL(10,2) DEFAULT 0,
            email VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            date VARCHAR(10),
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            child_name VARCHAR(255) NOT NULL,
            parent_email VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            period VARCHAR(50) NOT NULL,
            date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'Sent'
        )
    `;
}

// Children functions
export async function getChildren() {
    try {
        const { rows } = await sql`SELECT * FROM children ORDER BY name`;
        return rows;
    } catch (error) {
        console.error('Error getting children:', error);
        return [];
    }
}

export async function saveChild(child) {
    try {
        const { rows } = await sql`
            INSERT INTO children (name, rate, email)
            VALUES (${child.name}, ${child.rate || 0}, ${child.email || ''})
            RETURNING *
        `;
        return rows[0];
    } catch (error) {
        console.error('Error saving child:', error);
        throw error;
    }
}

export async function updateChild(id, updates) {
    try {
        const { rows } = await sql`
            UPDATE children
            SET name = ${updates.name}, rate = ${updates.rate}, email = ${updates.email || ''}
            WHERE id = ${id}
            RETURNING *
        `;
        return rows[0];
    } catch (error) {
        console.error('Error updating child:', error);
        throw error;
    }
}

export async function deleteChild(id) {
    try {
        await sql`DELETE FROM children WHERE id = ${id}`;
        return true;
    } catch (error) {
        console.error('Error deleting child:', error);
        throw error;
    }
}

// Attendance functions
export async function getAttendance() {
    try {
        const { rows } = await sql`SELECT * FROM attendance ORDER BY COALESCE(date, start_time::text) DESC, start_time DESC`;
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
        console.error('Error getting attendance:', error);
        return [];
    }
}

export async function checkIn(childId) {
    try {
        const { rows } = await sql`
            INSERT INTO attendance (child_id, start_time)
            VALUES (${childId}, NOW())
            RETURNING *
        `;
        return rows[0];
    } catch (error) {
        console.error('Error checking in:', error);
        throw error;
    }
}

export async function checkOut(childId) {
    try {
        const { rows } = await sql`
            UPDATE attendance
            SET end_time = NOW()
            WHERE child_id = ${childId} AND end_time IS NULL
            RETURNING *
        `;
        return rows[0];
    } catch (error) {
        console.error('Error checking out:', error);
        throw error;
    }
}

export async function deleteAttendance(id) {
    try {
        await sql`DELETE FROM attendance WHERE id = ${id}`;
        return true;
    } catch (error) {
        console.error('Error deleting attendance:', error);
        throw error;
    }
}

// Helper functions
export const calculateSessionHours = async (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(0, (e - s) / (1000 * 60 * 60));
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
        console.error('Error getting total hours:', error);
        return 0;
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
        console.error('Error getting today hours:', error);
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
        console.error('Error logging hours:', error);
        throw error;
    }
};

export const processScheduledAttendance = async () => {
    // This function was for auto-scheduling, can be implemented later if needed
    console.log('processScheduledAttendance called - not implemented for Postgres yet');
    return { success: true };
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
        console.error('Error updating attendance:', error);
        throw error;
    }
};

export const getChild = async (id) => {
    try {
        const { rows } = await sql`SELECT * FROM children WHERE id = ${id}`;
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting child:', error);
        return null;
    }
};

// Settings functions (compatible with serverStore)
const getDefaultSettings = () => ({
    businessName: '',
    businessEmail: '',
    bankName: '',
    accountName: '',
    sortCode: '',
    accountNumber: '',
    paymentTermsNote: '',
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
        };
    } catch (error) {
        console.error('Error getting settings:', error);
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
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
            `;
        } else {
            // Insert new
            await sql`
                INSERT INTO settings (business_name, business_email, bank_name, account_name, sort_code, account_number, payment_terms_note)
                VALUES (
                    ${settings.businessName || ''},
                    ${settings.businessEmail || ''},
                    ${settings.bankName || ''},
                    ${settings.accountName || ''},
                    ${settings.sortCode || ''},
                    ${settings.accountNumber || ''},
                    ${settings.paymentTermsNote || ''}
                )
            `;
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
};

// Invoices functions
export const getInvoices = async () => {
    try {
        const { rows } = await sql`
            SELECT * FROM invoices
            ORDER BY date_sent DESC
        `;
        return rows.map(row => ({
            id: row.id,
            childId: row.child_id,
            childName: row.child_name,
            parentEmail: row.parent_email,
            amount: parseFloat(row.amount),
            period: row.period,
            dateSent: row.date_sent?.toISOString(),
            status: row.status
        }));
    } catch (error) {
        console.error('Error getting invoices:', error);
        return [];
    }
};

// Expenses functions (placeholder - expenses table not yet implemented)
export const getExpenses = async () => {
    console.log('getExpenses called - not yet implemented for Postgres');
    return [];
};

export const addExpense = async (expense) => {
    console.log('addExpense called - not yet implemented for Postgres', expense);
    return { success: true };
};
