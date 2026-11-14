import Link from 'next/link';
import PublicPage from '@/components/PublicPage';
import { CONTACT_EMAIL, OPERATOR_NAME, POLICY_UPDATED } from '@/lib/siteInfo';

export const metadata = {
    title: 'Privacy policy · LittleHours',
    description: 'How LittleHours collects, uses and protects your information.',
};

export default function PrivacyPage() {
    const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

    return (
        <PublicPage title="Privacy policy" subtitle={`Last updated ${POLICY_UPDATED}`}>
            <h2>Who we are</h2>
            <p>
                LittleHours is an app that helps childminders track hours and send invoices. It is run by {OPERATOR_NAME} in the
                United Kingdom. If you have any question about your information, email {email}.
            </p>

            <h2>What we collect</h2>
            <ul>
                <li><strong>Your account:</strong> your name and email address, and your password (stored only as a secure hash). If you use Sign in with Apple, we receive the name and email Apple shares with us.</li>
                <li><strong>Your business details:</strong> what you enter in Settings to appear on invoices, such as your business name, address, registration number and bank details.</li>
                <li><strong>Children and parents:</strong> the children you add, their parents’ email addresses, the hours you log, and the invoices you create and send.</li>
                <li><strong>Assistant messages:</strong> what you type or say to the assistant, if you choose to use it.</li>
                <li><strong>Sign-in and usage records:</strong> when you sign in, your IP address and device type, which keep your account secure; and a count of invoice emails and assistant requests, which enforces daily limits.</li>
            </ul>
            <p>Your colour theme and your assistant chat history are kept only on your device.</p>

            <h2>How we use it</h2>
            <p>
                Only to run LittleHours for you: to show your records, create invoice PDFs, email invoices to parents when you
                ask, send password-reset codes, and keep the service secure. We don’t show adverts, we don’t track you across
                other apps or websites, and we never sell your information.
            </p>

            <h2>Information about children and parents</h2>
            <p>
                When you add a child or a parent’s email, you decide what is recorded and why, so you are responsible for that
                information under data protection law. LittleHours stores and uses it only on your behalf, to provide the app’s
                features to you.
            </p>

            <h2>The AI assistant</h2>
            <p>
                The assistant is optional, and it asks your permission before its first use. When you use it, your message and
                the details needed to answer it (for example, children’s names and logged hours) are sent to OpenAI, which
                processes them to produce a reply. Under OpenAI’s terms for business customers, this data is not used to
                train their models.
            </p>
            <p>
                If you speak to the assistant, your speech is turned into text by your device’s own speech recognition (on
                iPhone, provided by Apple). LittleHours only receives the text.
            </p>

            <h2>Who we share it with</h2>
            <p>We use these service providers to run LittleHours. Each one only processes your information to provide its service to us:</p>
            <ul>
                <li><strong>Vercel</strong>: hosts the app.</li>
                <li><strong>Neon</strong>: stores the database.</li>
                <li><strong>Resend</strong>: sends invoice and password-reset emails.</li>
                <li><strong>OpenAI</strong>: powers the assistant, only when you use it.</li>
                <li><strong>Apple</strong>: provides Sign in with Apple, if you choose it.</li>
            </ul>
            <p>
                Some of these providers process information outside the UK, including in the United States. Where they do,
                the transfer is protected by the safeguards UK data protection law requires.
            </p>

            <h2>How long we keep it</h2>
            <p>
                We keep your information for as long as you have an account. You can delete your account at any time in
                <strong> Settings → Account → Delete account</strong>. This immediately deletes your account, children,
                attendance, invoices and settings. Copies may remain in our database provider’s backups for a short time
                before they are overwritten.
            </p>

            <h2>Your rights</h2>
            <p>
                You can ask to see, correct, export or delete the information we hold about you, or object to how we use it.
                Email {email} and we’ll reply within one month. If you’re unhappy with how we handle your information, you
                can complain to the Information Commissioner’s Office at{' '}
                <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
            </p>

            <h2>Security</h2>
            <p>
                Everything is sent over encrypted connections, passwords are stored only as secure hashes, and each account
                can only see its own records.
            </p>

            <h2>Children</h2>
            <p>LittleHours is for adult childminders. It is not meant to be used by children.</p>

            <h2>Changes to this policy</h2>
            <p>
                If we change this policy, we’ll update the date at the top of this page. For important changes, we’ll let you
                know in the app or by email. Questions? See <Link href="/support">Help &amp; support</Link>.
            </p>
        </PublicPage>
    );
}
