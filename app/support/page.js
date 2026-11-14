import Link from 'next/link';
import PublicPage from '@/components/PublicPage';
import { CONTACT_EMAIL } from '@/lib/siteInfo';

export const metadata = {
    title: 'Help & support · LittleHours',
    description: 'Get help with LittleHours, the hours and invoicing app for childminders.',
};

export default function SupportPage() {
    const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

    return (
        <PublicPage title="Help & support" subtitle="LittleHours tracks childminding hours and sends invoices to parents.">
            <h2>Contact us</h2>
            <p>
                Email {email} with any question, problem or idea. Please include the email address you use for LittleHours.
                We aim to reply within two working days.
            </p>

            <h2>I’ve forgotten my password</h2>
            <p>
                On the sign-in screen, tap <strong>Forgot your password?</strong> and enter your email. We’ll send you a code to
                set a new one. If you signed up with Apple, use <strong>Sign in with Apple</strong> instead.
            </p>

            <h2>A parent didn’t get their invoice</h2>
            <p>
                Check the parent’s email address on the child’s page, and ask them to look in their spam or junk folder.
                You can send it again from <strong>Invoices</strong>, or download the PDF and share it yourself.
            </p>

            <h2>The voice assistant isn’t working</h2>
            <p>
                The first time you speak, your phone asks for permission to use the microphone and speech recognition. If
                you said no, turn them back on in your iPhone’s <strong>Settings → LittleHours</strong>. You can always type
                to the assistant instead.
            </p>

            <h2>How do I delete my account?</h2>
            <p>
                In the app, go to <strong>Settings → Account → Delete account</strong>. This permanently deletes your account
                and everything in it: children, hours, invoices and settings.
            </p>

            <h2>Your privacy</h2>
            <p>
                Read how we handle your information, and the children’s and parents’ details you add, in our{' '}
                <Link href="/privacy">privacy policy</Link>.
            </p>
        </PublicPage>
    );
}
