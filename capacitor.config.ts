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
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f3f8f3',
  },
};

export default config;
