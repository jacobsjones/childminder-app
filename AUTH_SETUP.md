# Accounts setup and release

## Environment variables (Vercel → Project → Settings → Environment Variables)

Set these in the **Production** environment. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` already exist and are used to email password-reset codes.

| Name | Production value |
|---|---|
| `BETTER_AUTH_SECRET` | a random 32-byte base64 string (different from your local one) |
| `BETTER_AUTH_URL` | `https://childminder-app.vercel.app` (Production only; previews use their own URL automatically) |
| `ADMIN_SECRET` | a new random string; only needed to call `POST /api/init-db` |
| `APPLE_CLIENT_ID` | your Services ID, e.g. `com.jacobjones.littlehours.web` |
| `APPLE_TEAM_ID` | your 10-character Team ID |
| `APPLE_KEY_ID` | the Key ID of the Sign in with Apple key |
| `APPLE_PRIVATE_KEY` | the full contents of the downloaded `.p8` file |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `com.jacobjones.littlehours` |

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

Do these in order. `.env.production-db` holds the production database connection strings plus `BETTER_AUTH_SECRET` (same value as in Vercel).

1. **Back up**: in Neon, create a branch named `backup-before-accounts` from `main`.
2. **Create her account and claim the data**:

   ```
   node --env-file=.env.production-db --import tsx scripts/create-owner.mjs --email <her email> --name "<her name>"
   ```

   - Run it from **PowerShell or Windows Terminal**, not Git Bash/mintty, where typing may be visible. The first time, glance at the password prompt: if the characters show as you type, stop with Ctrl+C and switch terminals.
   - It prints `Database: <host>` and asks you to type `YES`. Check the host is the **production** host. It must not be the dev branch host, which starts with `ep-raspy-firefly`. If it is wrong, type anything else to abort; nothing is changed.
   - It asks for her password twice (at least 8 characters). Pick it, and tell her.
   - If her account already exists it does not ask for a password. It prints the account name and how many children and invoices it already owns; check these match what she has.
   - Check that the claimed counts match what she has in the app.
3. **Deploy**: merge to `main` (or `vercel deploy --prod`).
4. **Finalize**:

   ```
   node --env-file=.env.production-db --import tsx scripts/create-owner.mjs --email <her email> --finalize
   ```

   Same checks as step 2 (terminal, host, `YES`). `--finalize` never creates an account: it refuses if the email has no account, and refuses if any unowned rows remain. It must report `Still unowned: 0 ...` and `Finalized`.
5. **Sign her in**: open the app on her phone, sign in with her email and the password you chose. She stays signed in for 60 days, renewed every day she uses it. She can change the password in Settings → Account.
6. **Apple**: once the Apple setup above is done (and the `APPLE_*` values are in Vercel and redeployed), build and submit the new iOS version.

**If something goes wrong** before step 4: the old code ignores the new columns, so redeploying the previous version is enough. After step 4, restore from the `backup-before-accounts` branch.
