import { Fredoka, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Navigation from '@/components/Navigation';
import VoiceAssistant from '@/components/VoiceAssistant';

const fredoka = Fredoka({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-fredoka',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata = {
    title: 'LittleHours',
    description: 'Simple time tracking & invoicing for childminders.',
    manifest: '/manifest.json',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#f3f8f3' },
        { media: '(prefers-color-scheme: dark)', color: '#1c211d' },
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${fredoka.variable} ${inter.variable}`}>
            <body>
                <ThemeProvider>
                    <Navigation />
                    <div className="container">
                        {children}
                    </div>
                    <VoiceAssistant />
                </ThemeProvider>
            </body>
        </html>
    );
}
