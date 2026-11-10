// Create the existing childminder's account and give her all existing data.
//
//   node --env-file=<env file> --import tsx scripts/create-owner.mjs --email her@example.com --name "Her Name"
//   node --env-file=<env file> --import tsx scripts/create-owner.mjs --email her@example.com --finalize
//
// The password is asked for on screen, so it never lands in shell history.
// Safe to run again: it reuses her account and only claims unowned rows.
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
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

async function askPassword() {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const password = await rl.question('Choose her password (at least 8 characters): ');
    rl.close();
    return password.trim();
}

async function main() {
    if (!values.email) throw new Error('--email is required');

    const host = new URL(process.env.POSTGRES_URL).host;
    console.log(`Database: ${host}`);

    await migrateDatabase();

    let userId = await findUserId(values.email);
    if (userId) {
        console.log(`Account already exists for ${values.email}; reusing it.`);
    } else {
        if (!values.name) throw new Error('--name is required to create the account');
        const password = await askPassword();
        if (password.length < 8) throw new Error('Password must be at least 8 characters');
        const result = await auth.api.signUpEmail({
            body: { email: values.email, password, name: values.name },
        });
        userId = result.user.id;
        console.log(`Created account for ${values.email}.`);
    }

    const claimed = await claimUnownedData(userId);
    console.log(`Claimed ${claimed.children} children, ${claimed.invoices} invoices, ${claimed.settings} settings rows.`);

    const left = await countUnownedRows();
    console.log(`Still unowned: ${left.children} children, ${left.invoices} invoices, ${left.settings} settings rows.`);

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
        process.exit(1);
    });
