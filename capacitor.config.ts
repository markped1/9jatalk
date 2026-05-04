import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.njatalk.app',
  appName: '9jaTalk',
  webDir: 'dist',
  server: {
    // For development: point to your local server
    // Remove or comment this out for production builds
    url: 'http://localhost:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#008751',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#008751',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#008751',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
