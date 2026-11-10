import SignInForm from '@/components/auth/SignInForm';
import { isAppleConfigured } from '@/lib/appleAuth';

export const metadata = { title: 'Sign in · LittleHours' };

export default function SignInPage() {
    return <SignInForm appleEnabled={isAppleConfigured()} />;
}
