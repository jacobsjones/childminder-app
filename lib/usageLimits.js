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
 * Invoice emails depend on the kind of account:
 * - trusted accounts (rows in trusted_accounts, set only by the owner) get
 *   perUser and no shared pool;
 * - every other account gets newPerUser while it is younger than
 *   newAccountDays, otherwise perUser, and all of them together share pool.
 * Whether an email is verified plays no part: anyone can get that flag.
 * newPerUser being set is what turns on the account-type logic in reserveUsage.
 */
export function defaultLimitsFor(kind) {
    if (kind === USAGE_KINDS.invoiceEmail) {
        return {
            perUser: intFromEnv('INVOICE_EMAILS_PER_USER_PER_DAY', 60),
            newPerUser: intFromEnv('INVOICE_EMAILS_PER_NEW_USER_PER_DAY', 20),
            newAccountDays: intFromEnv('NEW_ACCOUNT_DAYS', 7),
            pool: intFromEnv('INVOICE_EMAILS_SHARED_POOL_PER_DAY', 40),
        };
    }
    if (kind === USAGE_KINDS.assistant) {
        return { perUser: intFromEnv('ASSISTANT_REQUESTS_PER_USER_PER_DAY', 100) };
    }
    return { perUser: 100 };
}

// wording is the kind whose messages to use; it defaults to the kind being limited.
function limitMessage(wording, scope, limits) {
    if (wording === USAGE_KINDS.invoiceEmail) {
        if (scope === 'pool') {
            return 'LittleHours has reached today\'s email limit. Please try again tomorrow.';
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
 *
 * limits and options.wording exist so tests can use their own kind with
 * small limits and still get the invoice-email messages.
 */
export async function reserveUsage(userId, kind, limits = defaultLimitsFor(kind), options = {}) {
    const accountAware = limits.newPerUser !== undefined;
    const days = limits.newAccountDays ?? 7;
    const wording = options.wording ?? kind;

    // Keep the table small: nothing older than two days is ever counted.
    await sql`DELETE FROM usage_events WHERE kind = ${kind} AND created_at < now() - interval '2 days'`;

    const { rows: inserted } = await sql`
        INSERT INTO usage_events (user_id, kind) VALUES (${userId}, ${kind}) RETURNING id
    `;
    const id = inserted[0].id;

    try {
        let trusted = false;
        let isNew = false;
        if (accountAware) {
            const { rows: accountRows } = await sql`
                SELECT EXISTS (SELECT 1 FROM trusted_accounts t WHERE t.user_id = u.id) AS trusted,
                    (u."createdAt" > now() - make_interval(days => ${days})) AS is_new
                FROM "user" u WHERE u.id = ${userId}
            `;
            trusted = accountRows[0]?.trusted === true;
            isNew = !trusted && (accountRows.length === 0 || accountRows[0].is_new === true);
        }

        const { rows: userRows } = await sql`
            SELECT COUNT(*)::int AS n FROM usage_events
            WHERE user_id = ${userId} AND kind = ${kind} AND created_at > now() - interval '24 hours'
        `;
        const userCap = isNew ? limits.newPerUser : limits.perUser;
        let over = null;
        if (userRows[0].n > userCap) {
            over = isNew ? 'newUser' : 'user';
        } else if (accountAware && !trusted && limits.pool) {
            const { rows: poolRows } = await sql`
                SELECT COUNT(*)::int AS n FROM usage_events e
                WHERE e.kind = ${kind} AND e.created_at > now() - interval '24 hours'
                  AND NOT EXISTS (SELECT 1 FROM trusted_accounts t WHERE t.user_id = e.user_id)
            `;
            if (poolRows[0].n > limits.pool) over = 'pool';
        }
        if (over) throw new LimitError(limitMessage(wording, over, { ...limits, newAccountDays: days }));
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
