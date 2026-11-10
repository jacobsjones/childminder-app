// Create the existing childminder's account and give her all existing data.
//
//   node --env-file=<env file> --import tsx scripts/create-owner.mjs --email her@example.com --name "Her Name"
//   node --env-file=<env file> --import tsx scripts/create-owner.mjs --email her@example.com --finalize
//
// The password is asked for (hidden) on screen, so it never lands in shell history.
// Safe to run again: it reuses her account and only claims unowned rows.
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { migrateDatabase, finalizeOwnership } from '@/lib/migrate';
import { claimUnownedData, countUnownedRows } from '@/lib/ownership';

const { values } = parseArgs({
    options: {
        email: { type: 'string' },
        name: { type: 'string' },
        finalize: { type: 'boolean', default: false },
    },
});

async function findUserId(email) {
    const { rows } = await sql`SELECT id FROM "user" WHERE email = ${email.toLowerCase()}`;
    return rows[0]?.id ?? null;
}

// You vouch for her email, so Sign in with Apple using the same address can link to this account.
async function markEmailVerified(userId) {
    await sql`UPDATE "user" SET "emailVerified" = true WHERE id = ${userId}`;
    console.log('Marked her email as verified (so Sign in with Apple can link to this account).');
}

let muted = false;
const rl = createInterface({
    input: process.stdin,
    output: new Writable({
        write(chunk, encoding, callback) {
            if (!muted) process.stdout.write(chunk, encoding);
            callback();
        },
    }),
    terminal: Boolean(process.stdin.isTTY),
});
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt, { hidden = false } = {}) {
    process.stdout.write(prompt);
    muted = hidden && Boolean(process.stdin.isTTY);
    const { value, done } = await lines.next();
    if (muted) process.stdout.write('\n');
    muted = false;
    if (done) throw new Error('No input received.');
    return value;
}

async function askPassword() {
    if (!process.stdin.isTTY) {
        console.log('Note: input is not a terminal, so the password may be visible as you type. Use PowerShell or Windows Terminal for the real run.');
    }
    const first = await ask('Choose her password (at least 8 characters): ', { hidden: true });
    if (first.length === 0) throw new Error('Password must not be empty.');
    if (first.length < 8) throw new Error('Password must be at least 8 characters.');
    const second = await ask('Type the password again: ', { hidden: true });
    if (first !== second) throw new Error('The two passwords do not match.');
    return first;
}

async function main() {
    if (!values.email) throw new Error('--email is required');
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not set. Pass the env file with --env-file=<file>.');
    }

    const host = new URL(process.env.POSTGRES_URL).host;
    console.log(`Database: ${host}`);
    const answer = await ask(`Type YES to continue against ${host}: `);
    if (answer !== 'YES') {
        console.log('Aborted. Nothing was changed.');
        process.exit(1);
    }

    // With --finalize the account must already exist; check before changing anything.
    if (values.finalize) {
        if (!(await findUserId(values.email))) {
            throw new Error(`No account for ${values.email}. Run without --finalize first, or check the email.`);
        }
    }

    await migrateDatabase();

    let userId = await findUserId(values.email);
    if (userId) {
        const { rows } = await sql`
            SELECT u.name,
                (SELECT COUNT(*) FROM children WHERE user_id = u.id)::int AS children,
                (SELECT COUNT(*) FROM invoices WHERE user_id = u.id)::int AS invoices
            FROM "user" u WHERE u.id = ${userId}
        `;
        const existing = rows[0];
        console.log(`Account already exists for ${values.email} (name: ${existing.name}); reusing it.`);
        console.log(`It already owns ${existing.children} children and ${existing.invoices} invoices.`);
        if (!values.finalize) await markEmailVerified(userId);
    } else {
        if (!values.name) throw new Error('--name is required to create the account');
        const password = await askPassword();
        const result = await auth.api.signUpEmail({
            body: { email: values.email, password, name: values.name },
        });
        userId = result.user.id;
        console.log(`Created account for ${values.email}.`);
        await markEmailVerified(userId);
    }

    const claimed = await claimUnownedData(userId);
    console.log(`Claimed ${claimed.children} children, ${claimed.invoices} invoices, ${claimed.settings} settings rows.`);

    const left = await countUnownedRows();
    console.log(`Still unowned: ${left.children} children, ${left.invoices} invoices, ${left.settings} settings rows.`);
    if (!values.finalize) {
        console.log('New rows may appear before the new code is deployed; run again with --finalize to claim them.');
    }

    if (values.finalize) {
        if (left.children || left.invoices || left.settings) {
            throw new Error('Refusing to finalize while unowned rows remain. Look at them before continuing.');
        }
        await finalizeOwnership();
        console.log('Finalized: every child, invoice and settings row now has to have an owner.');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`Failed: ${error.message}`);
        if (error.detail) console.error(`Detail: ${error.detail}`);
        if (error.code) console.error(`Code: ${error.code}`);
        process.exit(1);
    });
