"use client";

import { useEffect } from "react";

/**
 * When the shop runs inside the Capacitor Android/iOS shell, keep the WebView
 * below the system status bar so the header isn't covered by the clock/icons.
 */
export function NativeChrome() {
  useEffect(() => {
    const cap = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
        };
      }
    ).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    document.documentElement.classList.add("native-app");
    if (cap.getPlatform?.() === "android") {
      document.documentElement.classList.add("native-android");
    }

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: "#ffffff" });
        await StatusBar.setStyle({ style: Style.Light });
        document.documentElement.classList.remove("native-android");
      } catch {
        // Plugin missing or web — keep CSS fallback for Android.
      }
    })();
  }, []);

  return null;
}
