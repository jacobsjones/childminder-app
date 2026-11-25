'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// In the iOS app, match the status bar text to the app's theme rather than
// the phone's, so the time and battery stay readable when the user picks a
// theme in Settings. Older app builds without the plugin skip this.
function syncStatusBar(activeTheme) {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('StatusBar')) return;
    StatusBar.setStyle({ style: activeTheme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
}

const ThemeContext = createContext({
    theme: 'system',
    setTheme: (theme) => { },
});

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        // Load saved theme
        const saved = localStorage.getItem('theme');
        if (saved) {
            const timer = setTimeout(() => setTheme(saved), 0);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            let activeTheme = theme;
            if (theme === 'system') {
                activeTheme = mediaQuery.matches ? 'dark' : 'light';
            }

            if (activeTheme === 'dark') {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.removeAttribute('data-theme');
            }
            syncStatusBar(activeTheme);
        };

        applyTheme();
        localStorage.setItem('theme', theme);

        // Listen for system changes if in system mode
        if (theme === 'system') {
            mediaQuery.addEventListener('change', applyTheme);
            return () => mediaQuery.removeEventListener('change', applyTheme);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
