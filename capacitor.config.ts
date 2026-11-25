import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app is a thin shell around the live site: the app relies on
// server API routes (chat, invoices, database), so it can't be bundled
// as static files. Deploying the site updates the app too.
const config: CapacitorConfig = {
  appId: 'com.jacobjones.littlehours',
  appName: 'LittleHours',
  // Only holds the offline fallback page; the real UI comes from server.url.
  webDir: 'capacitor-www',
  server: {
    url: 'https://childminder-app.vercel.app',
    errorPath: 'offline.html',
  },
  // The page draws under the status bar and home indicator (viewport-fit=cover
  // in app/layout.js) and pads itself with env(safe-area-inset-*), so its own
  // themed background fills the whole screen. A fixed colour or 'automatic'
  // insets left a light strip behind the status bar in dark mode.
  ios: {
    contentInset: 'never',
  },
};

export default config;
