# Invoice Email Setup Guide

This guide covers sending invoices to parents by email, and filling in the details that appear on the invoice itself.

## Prerequisites

You need a [Resend](https://resend.com) account to send emails. Resend offers a generous free tier that's perfect for this use case.

## Setup Steps

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up for a free account
2. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to "API Keys" in the sidebar
3. Click "Create API Key"
4. Give it a name (e.g., "Childminder App")
5. Copy the API key (you'll only see it once!)

### 3. Set Up Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   RESEND_API_KEY=re_123456789abcdef
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

`onboarding@resend.dev` is Resend's shared test domain. It works immediately, but **you can only send to the email address on your own Resend account** — attempts to email a parent will be rejected. To send to parents you need to verify your own domain, which is the next section.

### 4. Verify Your Own Domain (required to email parents)

You need a domain you control. If you don't have one, any registrar will do — Cloudflare and Namecheap are inexpensive.

1. **Add the domain in Resend.** Dashboard → **Domains** → **Add Domain**.

   Use a *subdomain* rather than your root domain — e.g. `invoices.yourdomain.co.uk` or `mail.yourdomain.co.uk`. Resend recommends this so your sending reputation stays separate from your main domain's, and it leaves any existing email on that domain untouched.

2. **Copy the DNS records Resend shows you.** It generates a set specific to your domain and region — typically an MX record for bounce handling, an SPF `TXT` record, and a DKIM `TXT` record. The exact values differ per domain, so always use the ones Resend gives you rather than copying from a guide.

   Copy the DKIM key **verbatim**. It's long, and one wrong character fails verification.

3. **Add the records at your DNS host** — wherever your domain's nameservers point (your registrar, or Cloudflare if you use it).

   If your DNS host automatically appends the domain name to record names, don't paste the full hostname, or you'll end up with `resend._domainkey.yourdomain.co.uk.yourdomain.co.uk`. This is the most common reason verification fails.

4. **Click Verify in Resend.** Usually takes a few minutes; it can take a few hours depending on your DNS TTL. Resend shows which specific record is still failing if it doesn't pass.

5. **Optionally add a DMARC record** once verified — a `_dmarc` `TXT` record starting with `p=none` to monitor. Not required, but Gmail and Yahoo are less forgiving of senders without one.

6. **Point the app at your domain.** In `.env.local`:
   ```env
   RESEND_FROM_EMAIL=invoices@invoices.yourdomain.co.uk
   ```

   The address must be *at the verified domain*. The part before the `@` can be anything you like — it does not need to be a real mailbox.

7. **Restart the dev server** so Next.js picks up the change:
   ```bash
   npm run dev
   ```

> **If you deploy this app**, `.env*` is gitignored and won't travel with your code. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in your hosting platform's environment variables too (on Vercel: Project → Settings → Environment Variables).

### 5. Run the Database Migration

The invoice document fields (your address, Ofsted number, unavailable dates) and the detail that makes past invoices re-sendable live in database columns added after the original build. Visit this once to add them:

```
http://localhost:3000/api/init-db
```

It's safe to run more than once — it only adds what's missing.

## Filling In Your Details

Everything printed on the invoice comes from **Settings**. Nothing is hardcoded.

### Business details

| Field | Where it appears |
|---|---|
| Business name | The invoice title (`[Business Name] Invoice`) **and** the sender name parents see in their inbox |
| Business email | Set as the email's reply-to, so parents' replies reach your real inbox |
| Bank name, account name, sort code, account number, payment terms | Stored, but **not currently printed** on the invoice — see "What's on the invoice" below |

Set **Business name** and **Business email** before you send anything. If the business name is blank, the invoice titles itself "Childcare Invoice" and mail goes out as "LittleHours".

### Invoice document

| Field | Notes |
|---|---|
| Your name | Printed under "Kind regards" |
| Address | One line of the address per line |
| Ofsted registration number | Printed as `Ofsted registration number <value>` |
| Unavailable dates for this year | One date or date range per line, e.g. `Monday August 24th until Saturday 5th September`. Leave blank and the whole section is omitted |
| Absence policy note / Feedback note / Financial difficulties note | Leave blank to use the standard wording shown as placeholder text |

## Sending an Invoice

### 1. Add Parent Email Addresses

Each child needs a parent email before an invoice can be sent:

1. Go to **Children** → select a child → edit their profile
2. Fill in **Parent's email**
3. Save

Without it, the child's card shows a "No parent email yet" badge and the Preview button is greyed out (hovering it explains why).

### 2. Pick the billing month

At the top of the **Invoices** tab there's a **Billing month** picker. An invoice covers **only** the hours logged in the month you select — nothing before it, nothing after.

It defaults to the month you're in. The list offers every month that has hours logged, so at the start of October you can still invoice September.

A child with no hours in the selected month shows "No hours logged this month" and their Preview button is greyed out, so you can't accidentally send a £0.00 invoice.

### 3. Preview and Send

1. Go to **Invoices** → the **Invoices** tab
2. Check the **Billing month** is the one you mean to bill
3. Click **Preview** for the child
4. Check the PDF in the preview modal
5. **Download PDF** to keep a copy (optional)
6. **Send to [parent email]** to email it

Sent invoices are logged and appear in the invoice history below.

### 4. Sending by Voice

The voice assistant can also send invoices — "send an invoice to Alexandra for August". It filters that child's hours to the month you name, generates the same PDF, and sends the same email. See `VOICE_ASSISTANT_SETUP.md`.

## What's on the Invoice

A plain, document-style A4 page:

- A small decorative motif and the bold centred title `[Business Name] Invoice`
- `To: [parent]` and `Date: [DD/MM/YYYY]`
- `Childcare costs for` and `for [Month Year]`
- A single charges line — `[X] Hours £[rate] per hour  £[amount]` — followed by `TOTAL`
- Three note paragraphs: absence policy, feedback, financial difficulties
- `Kind regards`, your name, your address, and your Ofsted registration number
- A dashed rule, then **Unavailable dates for this year** (highlighted) with the dates in bold red

Two deliberate omissions worth knowing about:

- **No per-session breakdown table.** Earlier versions listed every dated session with start/end times. The invoice now shows a single aggregate charges line.
- **No bank details or payment terms.** The document has no payment section. The settings fields are still there, so this block can be added back if you want it.

### Billing period

Both routes bill a single month. The Invoices page uses the **Billing month** picker; the voice assistant uses the month you name ("send an invoice to Alexandra for August").

One thing to watch on the voice route: a month name with no year means the *current* year. Asking for "December" in January 2027 gives December 2027, not the December just gone. Say "December 2026" to be certain.

## Invoice History

Every sent invoice is listed under **Invoice history** on the Invoices tab, newest first, showing the child, the date sent, the period, the parent's email and the amount. Two running totals sit beside the heading: how much was **sent this month**, and how much is still **outstanding**.

The PDF itself isn't stored. Instead each invoice records the hours, the rate, the period, the invoice date and a snapshot of your business details as they were at the time — enough to rebuild the identical document later. Each entry has:

- **Download** — rebuilds the PDF and saves it. Because it uses the snapshot, it looks exactly as the parent received it, even if you've since changed your address or your hourly rate.
- **Re-send** — emails that same rebuilt invoice to the same parent. It asks you to confirm first, and it doesn't create a second history entry, since it's the same invoice going out again.
- **Mark as paid** / **Mark as unpaid** — tracks payment. Unpaid invoices count towards the outstanding total.

Invoices sent before this detail was recorded can still be seen and marked paid, but can't be rebuilt — they'll say so on the card.

There's currently no way to delete an invoice from the history.

## The Email

Parents receive:

- **Subject:** `Invoice for [period] - [Child Name]`, using the same period shown on the invoice
- **From:** your business name at your verified domain, with replies going to your business email
- **Body:** a plain serif page matching the invoice — the title, a greeting, the charges and total, and the same sign-off with your address and Ofsted number. A plain-text version is sent alongside the HTML, which helps with spam filtering.
- **Attachment:** the invoice PDF

The email and the PDF are built from the same data, so the figures and period always agree.

## Troubleshooting

### "No email configured" / Preview button disabled
Add the parent's email to the child's profile under **Children**.

### Email not sending
- Check `RESEND_API_KEY` is correct in `.env.local`
- Check `RESEND_FROM_EMAIL` is an address at a **verified** domain
- If still on `onboarding@resend.dev`, you can only send to your own Resend account address
- Check the Next.js server logs and the browser console for the underlying error
- Resend's dashboard has a log of every send attempt and why it failed

### Domain won't verify
- Check for doubled-up hostnames like `resend._domainkey.yourdomain.co.uk.yourdomain.co.uk`
- Confirm you added the records at the host your nameservers actually point to
- DNS changes can take a few hours to propagate; Resend names the failing record
- Re-copy the DKIM value rather than retyping it

### Emails go out as "LittleHours"
Set **Business name** in Settings — it's the sender display name and the invoice title.

### Address or unavailable dates missing from the invoice
Fill them in under Settings → **Invoice document**, and make sure you've run `/api/init-db` (see step 5).

### An invoice shows the wrong hours
Check the **Billing month** picker at the top of the Invoices tab — it bills only the month shown there.

### A past invoice says it can't be rebuilt
It was sent before the hours and rate were being recorded against each invoice. Nothing to fix; new invoices will be re-sendable.

## Cost

Resend's free tier has historically covered 100 emails/day and 3,000/month — plenty for a small childminding business. Check [Resend's pricing](https://resend.com/pricing) for current limits.

## Security Notes

- Never commit your `.env.local` file to git — it's already in `.gitignore`
- Keep your API key secret, and rotate it if it's ever exposed

## Support

- **Resend:** [Resend Documentation](https://resend.com/docs)
- **This app:** open an issue on GitHub
