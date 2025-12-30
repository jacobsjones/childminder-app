# Invoice Email Setup Guide

This guide will help you set up the email functionality for sending invoices to parents.

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

### 3. Configure Your Domain (Optional but Recommended)

**For Production:**
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for verification (usually takes a few minutes)

**For Testing:**
- Resend provides a free testing domain `onboarding@resend.dev`
- You can only send to your own verified email address using this domain

### 4. Set Up Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   RESEND_API_KEY=re_123456789abcdef  # Your API key from step 2
   RESEND_FROM_EMAIL=invoices@yourdomain.com  # Your verified domain email
   ```

   **For testing, use:**
   ```env
   RESEND_API_KEY=re_123456789abcdef
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

### 5. Restart Your Development Server

```bash
npm run dev
```

## How to Use

### 1. Add Parent Email Addresses

Before you can send invoices, make sure each child has a parent email configured:

1. Go to "Manage" → Select a child
2. Edit their profile
3. Add the parent's email address in the "Parent Email" field
4. Save changes

### 2. Generate and Send Invoice

1. Go to "Finances" → "Invoices" tab
2. Click "Preview Invoice" for the child
3. Review the PDF in the preview modal
4. Click "Download PDF" to save a copy (optional)
5. Click "Send to [parent email]" to email the invoice

### 3. Email Content

Parents will receive an email with:
- **Subject:** "Invoice for [Month Year] - [Child Name]"
- **Body:** Professional HTML email with invoice summary
- **Attachment:** PDF invoice with detailed breakdown

## Troubleshooting

### "No email configured" error
- Make sure you've added the parent's email in the child's profile
- The email field must be valid

### Email not sending
- Check that your `RESEND_API_KEY` is correct in `.env.local`
- Verify that `RESEND_FROM_EMAIL` matches your verified domain
- Check the browser console for error messages
- Look at the Next.js server logs for API errors

### Using the test domain
- With `onboarding@resend.dev`, you can only send to your own verified email
- Add your email as the parent email for testing
- For production, set up your own domain

## Invoice Features

The generated invoice includes:
- Professional header with business branding
- Invoice number (auto-generated)
- Bill-to information (parent details)
- Detailed session breakdown table:
  - Date
  - Start/End times
  - Hours worked
  - Cost per session
- Summary section:
  - Total hours
  - Hourly rate
  - **Total amount due**
- Payment terms (7 days)
- Professional footer

## Cost

Resend Free Tier:
- 100 emails/day
- 3,000 emails/month
- Perfect for small childminding businesses

## Security Notes

- Never commit your `.env.local` file to git
- The `.env.local` file is already in `.gitignore`
- Keep your API key secret
- Rotate your API key if it's ever exposed

## Support

For issues with:
- **Resend:** Check [Resend Documentation](https://resend.com/docs)
- **This app:** Open an issue on GitHub
