'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'system',
    setTheme: (theme) => { },
});

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        // Load saved theme
        const saved = localStorage.getItem('theme');
        if (saved) setTheme(saved);
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
