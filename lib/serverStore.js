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

// === Settings ===
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
        console.error('[serverStore.saveSettings] Error:', error);
        throw error;
    }
};

// === Invoices ===
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
        console.error('[serverStore.getInvoices] Error:', error);
        return [];
    }
};

export const logInvoice = async (invoice) => {
    try {
        const { rows } = await sql`
            INSERT INTO invoices (child_id, child_name, parent_email, amount, period, status)
            VALUES (
                ${invoice.childId},
                ${invoice.childName},
                ${invoice.parentEmail},
                ${invoice.amount},
                ${invoice.period},
                'Sent'
            )
            RETURNING *
        `;
        return {
            id: rows[0].id,
            childId: rows[0].child_id,
            childName: rows[0].child_name,
            parentEmail: rows[0].parent_email,
            amount: parseFloat(rows[0].amount),
            period: rows[0].period,
            dateSent: rows[0].date_sent?.toISOString(),
            status: rows[0].status
        };
    } catch (error) {
        console.error('[serverStore.logInvoice] Error:', error);
        throw error;
    }
};
