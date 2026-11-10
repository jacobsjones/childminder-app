import { sql } from '@vercel/postgres';
import { getMigrations } from 'better-auth/db/migration';
import { auth } from '@/lib/auth';

async function createAppTables() {
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

    // Enough detail per invoice to rebuild the exact PDF later, so a past
    // invoice can be downloaded or re-sent rather than only listed.
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10,2)`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2)`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS settings_snapshot TEXT`;
}

// Nullable at first so the old code, which knows nothing about owners,
// keeps working until the new code is deployed. finalizeOwnership() makes
// them required once every row has an owner.
async function addOwnerColumns() {
    await sql`ALTER TABLE children ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE`;
    await sql`CREATE INDEX IF NOT EXISTS children_user_id_idx ON children(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id)`;
    // One settings row per user. NULLs do not clash, so unowned legacy rows are fine.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS settings_user_id_key ON settings(user_id)`;
}

// One row per billable action (an invoice email, an assistant request), used
// to enforce the daily limits in lib/usageLimits.js.
async function createUsageTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS usage_events (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `;
    await sql`CREATE INDEX IF NOT EXISTS usage_events_user_kind_time ON usage_events (user_id, kind, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS usage_events_kind_time ON usage_events (kind, created_at)`;
}

// Accounts the owner has vouched for (set only by scripts/create-owner.mjs or by
// hand). A separate table so no Better Auth endpoint can ever write to it.
async function createTrustedAccountsTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS trusted_accounts (
            user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `;
}

/** Create or update every table. Safe to run any number of times. */
export async function migrateDatabase() {
    await createAppTables();
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    await addOwnerColumns();
    await createUsageTable();
    await createTrustedAccountsTable();
}

/** Make the owner required. Run only after every row has been claimed. */
export async function finalizeOwnership() {
    await sql`ALTER TABLE children ALTER COLUMN user_id SET NOT NULL`;
    await sql`ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL`;
    await sql`ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL`;
}
