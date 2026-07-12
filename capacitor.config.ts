import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Med Aura native shell (Android now, iOS later from this same config).
 *
 * Remote-server mode: the shell loads the deployed platform directly, so the
 * app always runs the latest release without store re-submissions. The tiny
 * bundle in mobile/www is only the native-side fallback (offline/error shell).
 */
const config: CapacitorConfig = {
  appId: "com.medaura.app",
  appName: "Med Aura",
  webDir: "mobile/www",
  server: {
    url: "https://med-aura.onrender.com",
    androidScheme: "https",
    errorPath: "error.html",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFCF7",
      showSpinner: false,
    },
  },
}

export default config
