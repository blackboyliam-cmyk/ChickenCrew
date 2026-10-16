import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "shop.karthikachickencentre.app",
  appName: "Karthika Chicken",
  webDir: "android-shell",
  server: {
    // The shop lives on Vercel; the Android app opens this URL in a native shell.
    url: "https://karthikachickencentre.shop",
    cleartext: false,
    allowNavigation: [
      "karthikachickencentre.shop",
      "*.karthikachickencentre.shop",
      "chickencrew.vercel.app",
      "*.razorpay.com",
      "accounts.google.com",
      "*.google.com",
      "*.googleapis.com",
      "*.gstatic.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#8C2433",
      showSpinner: false,
      launchShowDuration: 1200,
    },
    StatusBar: {
      // Keep the system clock/battery out of the header area.
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#ffffff",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#8C2433",
  },
};

export default config;
