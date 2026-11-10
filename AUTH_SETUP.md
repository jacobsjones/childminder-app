# Accounts setup and release

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set these in the **Production** environment. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` already exist and are used to email password-reset codes.

| Name | Production value |
|---|---|
| `BETTER_AUTH_SECRET` | a random 32-byte base64 string (different from your local one) |
| `BETTER_AUTH_URL` | `https://childminder-app.vercel.app` (Production only) |
| `ADMIN_SECRET` | a new random string; only needed to call `POST /api/init-db` |
| `APPLE_CLIENT_ID` | your Services ID, e.g. `com.jacobjones.littlehours.web` |
| `APPLE_TEAM_ID` | your 10-character Team ID |
| `APPLE_KEY_ID` | the Key ID of the Sign in with Apple key |
| `APPLE_PRIVATE_KEY` | the full contents of the downloaded `.p8` file |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `com.jacobjones.littlehours` |

Preview deployments are not supported for signing in: no preview secret is set, and previews are also behind the Vercel login. Test accounts on the production site or locally.

After the deploy, sign-in rate-limit counters are kept in the database. The `create-owner` run in step 3 of the release runbook creates the table as part of its migration; nothing extra to do.

Generate random values with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The Apple button stays hidden until all five `APPLE_*` values are set, so the Apple setup can come after the release. The sign-in pages are prerendered, so after adding or changing the `APPLE_*` values you must **redeploy** for the button to appear.

## Sign in with Apple (developer.apple.com → Certificates, Identifiers & Profiles)

1. **Identifiers → App IDs → `com.jacobjones.littlehours`**: tick **Sign In with Apple**, then Save.
2. **Identifiers → + → Services IDs**: description "LittleHours web", identifier `com.jacobjones.littlehours.web`. Tick **Sign In with Apple** → Configure:
   - Primary App ID: `com.jacobjones.littlehours`
   - Domains: `childminder-app.vercel.app`
   - Return URLs: `https://childminder-app.vercel.app/api/auth/callback/apple`
3. **Keys → +**: name "LittleHours Sign in with Apple", tick **Sign In with Apple** → Configure → primary App ID `com.jacobjones.littlehours`. Download the `.p8` (you can only download it once) and note the **Key ID**.
4. Your **Team ID** is shown under Membership details.
5. Put the values in Vercel (table above) and redeploy.
6. Build a new TestFlight version in Codemagic. If signing fails with a message about Sign in with Apple, delete the old App Store provisioning profile for `com.jacobjones.littlehours` in the Apple portal and run the build again; Codemagic will create a new profile that includes the capability.

Apple does not allow `localhost` return URLs, so the website's Apple button can only be tested on the deployed site.

## Release runbook

The rehearsal on the dev branch has already been done. These steps are the real run against production.

Two databases are involved and their hosts differ: the **dev branch** (in `.env.local`, host starts with `ep-raspy-firefly`) and **production** (in `.env.production-db`). Tests and rehearsals only ever use `.env.local`. The commands below use `.env.production-db` and change real data, so follow them in order. `.env.production-db` holds the production database connection strings plus `BETTER_AUTH_SECRET` (same value as in Vercel).

In the commands, replace `sue@example.com` and `Sue Example` with her real email and name (keep the quotes around the name).

1. **Back up**: in Neon, create a branch named `backup-before-accounts` from `main`.
2. **Set the production environment variables**: in Vercel → Project → Settings → Environment Variables, add these for **Production** (generate values with the command in the table above):
   - `BETTER_AUTH_SECRET`: a new value. Put the same value in `.env.production-db`.
   - `BETTER_AUTH_URL`: `https://childminder-app.vercel.app`
   - `ADMIN_SECRET`: a new value.

   Without `BETTER_AUTH_SECRET` the new code refuses to run in production, so this must be done before step 4. These do not take effect until the next deploy, so adding them now is harmless.
3. **Create her account and claim the data**. First print the production host:

   ```
   node --env-file=.env.production-db -e "console.log(new URL(process.env.POSTGRES_URL).host)"
   ```

   Then run:

   ```
   node --env-file=.env.production-db --import tsx scripts/create-owner.mjs --email sue@example.com --name "Sue Example"
   ```

   - Run it from **PowerShell or Windows Terminal**, not Git Bash/mintty. If the script prints `Note: input is not a terminal…`, or the password shows as you type, press Ctrl+C and switch terminals.
   - It prints `Database: <host>` and asks you to type `YES`. That host must match the one printed above exactly, and must not be the dev branch host. If it is wrong, type anything else to abort; nothing is changed.
   - Once you type `YES`, the script first adds the new columns and tables to the database. This is additive and safe: the old code ignores them, and every run does it anyway. So pressing Ctrl+C at the password prompt is also safe.
   - It asks for her password twice (at least 8 characters). Pick it, and tell her.
   - If her account already exists it does not ask for a password. It prints the account name and how many children and invoices it already owns; check these match what she has.
   - Check that the `Claimed ...` counts match what she has in the app.
   - **Rehearse the password prompt first (optional but recommended).** In PowerShell, against the DEV database, run the same command with `--env-file=.env.local`, a throwaway email like `prompt-check@example.test` and `--name "Prompt Check"`. Type `YES`, check the password is hidden as you type, then press Ctrl+C at the second password prompt. (The rehearsal owner `rehearsal-owner@example.test` already exists, so it would not ask for a password.)
4. **Deploy**. First check Vercel → Project → Settings → Deployment Protection is **Standard Protection** (it is today). It keeps old deployment URLs, which run the old code with no sign-in, private. Then merge to `main` (or `vercel deploy --prod`).
5. **Finalize**:

   ```
   node --env-file=.env.production-db --import tsx scripts/create-owner.mjs --email sue@example.com --finalize
   ```

   Same checks as step 3 (terminal, host, `YES`). `--finalize` never creates an account: it refuses if the email has no account. It first claims any rows the old code created since step 3 (see the `Claimed ...` line), and refuses only if some rows are still unowned after that. It must report `Still unowned: 0 ...` and `Finalized`.
6. **Sign her in**: open the app on her phone, sign in with her email and the password you chose. She stays signed in for 60 days, renewed every day she uses it. She can change the password in Settings → Account.
7. **Apple**: once the Apple setup above is done (and the `APPLE_*` values are in Vercel and redeployed), build and submit the new iOS version.

## If something goes wrong

- **Before step 4 (deploy)**: nothing to undo for users. The old code ignores the new columns and tables.
- **After the deploy, before step 5 (finalize)**: first check nobody else has signed up yet, because the old code shows everyone's data to everyone:

  ```
  node --env-file=.env.production-db --input-type=module -e "import { sql } from '@vercel/postgres'; console.log((await sql.query('SELECT count(*) FROM \x22user\x22')).rows[0])"
  ```

  Expect `count: '1'`. If it is more than 1, do **not** roll back; fix forward in the new code. If it is 1, in Vercel → Deployments open the previous production deployment and choose **Promote** (or **Instant Rollback**). The database can stay as it is.
- **After step 5 (finalize)**: the old code can no longer add children, invoices or settings, because every row must now have an owner. Either fix the problem in the new code and redeploy, or roll back (same account check as above first; if anyone else has signed up, fix forward):
  1. Allow unowned rows again (nothing is lost):

     ```
     node --env-file=.env.production-db --input-type=module -e "import { sql } from '@vercel/postgres'; for (const t of ['children', 'invoices', 'settings']) await sql.query('ALTER TABLE ' + t + ' ALTER COLUMN user_id DROP NOT NULL'); console.log('done')"
     ```

  2. Promote the previous deployment in Vercel, as above.
  3. Last resort only: restore the database from the backup. In Neon, use the restore / reset-from-branch option on the `main` branch, choosing `backup-before-accounts` (the exact label may differ). **Warning:** this loses everything entered since the backup was taken.
- **If `--finalize` refuses**: the new app works fine without finalize. Stop and investigate; it lists how many unowned rows are left.

## Usage limits

Anyone can sign up, so invoice emails and the AI assistant are rate limited. Each limit is counted over a rolling 24 hours (not a calendar day) and can be changed with an environment variable; a missing or invalid value falls back to the default.

**Who counts as new.** An account is *established* if its email is verified (the owner created by `create-owner` is, and so are Sign in with Apple accounts) or it was created more than 7 days ago. Everyone else is *new*. Normal email sign-ups cannot verify their email, so they are new for their first 7 days.

| Variable | Default | Protects |
| --- | --- | --- |
| `INVOICE_EMAILS_PER_USER_PER_DAY` | 60 | Invoice emails per established account (no shared total, so strangers cannot use up your allowance) |
| `INVOICE_EMAILS_PER_NEW_USER_PER_DAY` | 20 | Invoice emails per new account |
| `INVOICE_EMAILS_NEW_ACCOUNTS_TOTAL_PER_DAY` | 30 | All new accounts together, so sign-ups cannot exhaust the shared Resend sender |
| `NEW_ACCOUNT_DAYS` | 7 | How long an unverified account counts as new |
| `ASSISTANT_REQUESTS_PER_USER_PER_DAY` | 100 | One account using the assistant as a free OpenAI proxy |

The Resend free plan allows 100 emails a day, and password-reset codes use the same allowance. The established cap is per account, so a single account can send up to 60 a day; keep the new-account pool well below 100 so resets still work, and raise the numbers if you upgrade Resend.

Also set a monthly budget limit on the OpenAI project (platform.openai.com, Settings, Limits), as a backstop to the per-account assistant limit.

Usage is recorded in the `usage_events` table. It is created by the same migration (`npm run db:migrate`) that `create-owner` runs. If the production database was already migrated before this change was deployed, run the migration once more so the table exists: run the create-owner command again (it migrates and claims nothing new), or `POST /api/init-db` with the admin secret.
