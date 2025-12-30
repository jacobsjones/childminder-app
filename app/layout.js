import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Navigation from '@/components/Navigation';
import VoiceAssistant from '@/components/VoiceAssistant';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Childminding Invoice Manager',
    description: 'Track hours, manage invoices, and expenses.',
    manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ThemeProvider>
                    <Navigation />
                    <div className="container" style={{ margin: 0, padding: 0 }}>
                        <div style={{ padding: '2rem' }}>
                            {children}
                        </div>
                    </div>
                    <VoiceAssistant />
                </ThemeProvider>
            </body>
        </html>
    );
}
