import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.balcao.app',
  appName: 'Balcão',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    // O projeto iOS usa SPM; o ML Kit instalado é usado apenas no Android.
    includePlugins: [
      '@capacitor-community/sqlite',
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/haptics',
      '@capacitor/preferences',
      '@capacitor/share',
    ],
  },
}

export default config
