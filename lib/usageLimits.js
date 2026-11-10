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

/**
 * Limits over a rolling 24 hours, read from the environment on every call.
 *
 * Invoice emails distinguish established accounts (email verified, or older
 * than newAccountDays) from new ones. New accounts get a smaller per-account
 * cap and share one pool, so strangers signing up cannot use up the
 * allowance of an established account. newPerUser being set is what turns
 * on the account-type logic in reserveUsage.
 */
export function defaultLimitsFor(kind) {
    if (kind === USAGE_KINDS.invoiceEmail) {
        return {
            perUser: intFromEnv('INVOICE_EMAILS_PER_USER_PER_DAY', 60),
            newPerUser: intFromEnv('INVOICE_EMAILS_PER_NEW_USER_PER_DAY', 20),
            newPool: intFromEnv('INVOICE_EMAILS_NEW_ACCOUNTS_TOTAL_PER_DAY', 30),
            newAccountDays: intFromEnv('NEW_ACCOUNT_DAYS', 7),
        };
    }
    if (kind === USAGE_KINDS.assistant) {
        return { perUser: intFromEnv('ASSISTANT_REQUESTS_PER_USER_PER_DAY', 100) };
    }
    return { perUser: 100 };
}

function limitMessage(kind, scope, limits) {
    // Explicit account-aware limits (as used by tests) read like invoice-email limits.
    const invoiceStyle = kind === USAGE_KINDS.invoiceEmail || limits.newPerUser !== undefined;
    if (invoiceStyle) {
        if (scope === 'pool') {
            return 'LittleHours has reached today\'s limit for new accounts. Please try again tomorrow.';
        }
        if (scope === 'newUser') {
            return `New accounts can send ${limits.newPerUser} invoice emails a day for their first ${limits.newAccountDays} days. Try again tomorrow.`;
        }
        return `You've reached today's limit of ${limits.perUser} invoice emails. Try again tomorrow.`;
    }
    return `You've reached today's limit of ${limits.perUser} assistant requests. Try again tomorrow.`;
}

/**
 * Claim one unit of usage, or throw LimitError.
 *
 * The row is inserted first and counted afterwards, so concurrent requests
 * can never push usage past a limit (at worst they are rejected slightly
 * early). Returns the reservation id for releaseUsage.
 */
export async function reserveUsage(userId, kind, limits = defaultLimitsFor(kind)) {
    const accountAware = limits.newPerUser !== undefined;
    const days = limits.newAccountDays ?? 7;

    // Keep the table small: nothing older than two days is ever counted.
    await sql`DELETE FROM usage_events WHERE kind = ${kind} AND created_at < now() - interval '2 days'`;

    const { rows: inserted } = await sql`
        INSERT INTO usage_events (user_id, kind) VALUES (${userId}, ${kind}) RETURNING id
    `;
    const id = inserted[0].id;

    try {
        let isNew = false;
        if (accountAware) {
            const { rows: accountRows } = await sql`
                SELECT ("emailVerified" IS NOT TRUE AND "createdAt" > now() - make_interval(days => ${days})) AS is_new
                FROM "user" WHERE id = ${userId}
            `;
            isNew = accountRows.length === 0 || accountRows[0].is_new === true;
        }

        const { rows: userRows } = await sql`
            SELECT COUNT(*)::int AS n FROM usage_events
            WHERE user_id = ${userId} AND kind = ${kind} AND created_at > now() - interval '24 hours'
        `;
        const userCap = isNew ? limits.newPerUser : limits.perUser;
        let over = null;
        if (userRows[0].n > userCap) {
            over = isNew ? 'newUser' : 'user';
        } else if (isNew && limits.newPool) {
            const { rows: poolRows } = await sql`
                SELECT COUNT(*)::int AS n FROM usage_events e
                JOIN "user" u ON u.id = e.user_id
                WHERE e.kind = ${kind} AND e.created_at > now() - interval '24 hours'
                  AND u."emailVerified" IS NOT TRUE
                  AND u."createdAt" > now() - make_interval(days => ${days})
            `;
            if (poolRows[0].n > limits.newPool) over = 'pool';
        }
        if (over) throw new LimitError(limitMessage(kind, over, { ...limits, newAccountDays: days }));
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
