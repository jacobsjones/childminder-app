import { db, sql } from '@vercel/postgres';

/**
 * Give every row that has no owner yet to `userId`, in one transaction.
 * Only unowned rows are touched, so running it again changes nothing.
 */
export async function claimUnownedData(userId) {
    const client = await db.connect();
    try {
        await client.sql`BEGIN`;
        const children = await client.sql`UPDATE children SET user_id = ${userId} WHERE user_id IS NULL`;
        const invoices = await client.sql`UPDATE invoices SET user_id = ${userId} WHERE user_id IS NULL`;
        // The old app read settings with LIMIT 1, so claim the oldest row,
        // and only if she does not already have settings of her own.
        const settings = await client.sql`
            UPDATE settings SET user_id = ${userId}
            WHERE id = (SELECT MIN(id) FROM settings WHERE user_id IS NULL)
              AND NOT EXISTS (SELECT 1 FROM settings WHERE user_id = ${userId})
        `;
        await client.sql`COMMIT`;
        return { children: children.rowCount, invoices: invoices.rowCount, settings: settings.rowCount };
    } catch (error) {
        await client.sql`ROLLBACK`;
        throw error;
    } finally {
        client.release();
    }
}

export async function countUnownedRows() {
    const { rows } = await sql`
        SELECT
            (SELECT COUNT(*) FROM children WHERE user_id IS NULL)::int AS children,
            (SELECT COUNT(*) FROM invoices WHERE user_id IS NULL)::int AS invoices,
            (SELECT COUNT(*) FROM settings WHERE user_id IS NULL)::int AS settings
    `;
    return rows[0];
}
