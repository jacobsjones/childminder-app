import { Resend } from 'resend';

/** Email the 6-digit code used to reset a forgotten password. */
export async function sendPasswordResetCode(email, code) {
    if (!process.env.RESEND_API_KEY) {
        if (process.env.NODE_ENV !== 'production') {
            // Lets password reset be tested locally without email set up
            console.warn(`[auth] RESEND_API_KEY missing. Reset code for ${email}: ${code}`);
            return;
        }
        throw new Error('Email service is not configured');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
        from: `LittleHours <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: email,
        subject: `${code} is your LittleHours code`,
        text: `Your code to reset your LittleHours password is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for this, you can ignore this email.`,
        html: `<p>Your code to reset your LittleHours password is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p>`,
    });
    if (error) {
        throw new Error(error.message);
    }
}
