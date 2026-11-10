import SignUpForm from '@/components/auth/SignUpForm';
import { isAppleConfigured } from '@/lib/appleAuth';

export const metadata = { title: 'Create account · LittleHours' };

export default function SignUpPage() {
    return <SignUpForm appleEnabled={isAppleConfigured()} />;
}
