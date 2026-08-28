import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.blackcat.treasures',
  appName: 'Сокровища чёрного кота',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
