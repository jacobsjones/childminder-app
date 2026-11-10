import { sql } from '@vercel/postgres';
import { LimitError } from '@/lib/errors';

export const USAGE_KINDS = {
    invoiceEmail: 'invoice_email',
    assistant: 'assistant',
};

function intFromEnv(name, fallback) {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Limits over a rolling 24 hours, read from the environment on every call. */
export function defaultLimitsFor(kind) {
    if (kind === USAGE_KINDS.invoiceEmail) {
        return {
            perUser: intFromEnv('INVOICE_EMAILS_PER_USER_PER_DAY', 60),
            total: intFromEnv('INVOICE_EMAILS_TOTAL_PER_DAY', 80),
        };
    }
    if (kind === USAGE_KINDS.assistant) {
        return {
            perUser: intFromEnv('ASSISTANT_REQUESTS_PER_USER_PER_DAY', 100),
            total: null,
        };
    }
    return { perUser: 100, total: null };
}

function limitMessage(kind, scope, perUser) {
    if (kind === USAGE_KINDS.invoiceEmail) {
        return scope === 'total'
            ? 'LittleHours has reached today\'s email limit. Please try again tomorrow.'
            : `You've reached today's limit of ${perUser} invoice emails. Try again tomorrow.`;
    }
    return `You've reached today's limit of ${perUser} assistant requests. Try again tomorrow.`;
}

/**
 * Claim one unit of usage, or throw LimitError.
 *
 * The row is inserted first and counted afterwards, so concurrent requests
 * can never push usage past a limit (at worst they are rejected slightly
 * early). Returns the reservation id for releaseUsage.
 */
export async function reserveUsage(userId, kind, limits = defaultLimitsFor(kind)) {
    const { perUser, total } = limits;

    // Keep the table small: nothing older than two days is ever counted.
    await sql`DELETE FROM usage_events WHERE kind = ${kind} AND created_at < now() - interval '2 days'`;

    const { rows: inserted } = await sql`
        INSERT INTO usage_events (user_id, kind) VALUES (${userId}, ${kind}) RETURNING id
    `;
    const id = inserted[0].id;

    try {
        const { rows: userRows } = await sql`
            SELECT COUNT(*)::int AS n FROM usage_events
            WHERE user_id = ${userId} AND kind = ${kind} AND created_at > now() - interval '24 hours'
        `;
        let over = null;
        if (userRows[0].n > perUser) {
            over = 'user';
        } else if (total) {
            const { rows: totalRows } = await sql`
                SELECT COUNT(*)::int AS n FROM usage_events
                WHERE kind = ${kind} AND created_at > now() - interval '24 hours'
            `;
            if (totalRows[0].n > total) over = 'total';
        }
        if (over) throw new LimitError(limitMessage(kind, over, perUser));
    } catch (error) {
        await sql`DELETE FROM usage_events WHERE id = ${id}`;
        throw error;
    }
    return id;
}

/** Give a reservation back, e.g. when the email it was for failed to send. */
export async function releaseUsage(reservationId) {
    await sql`DELETE FROM usage_events WHERE id = ${reservationId}`;
}
