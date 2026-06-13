import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.com.basak.vardiya',
  appName: 'Başak Vardiya',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  // İlk kurulumda: npm run build && npx cap add android && npx cap sync android
};

export default config;
