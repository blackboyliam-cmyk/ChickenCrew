"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * When the shop runs inside the Capacitor Android/iOS shell, keep the WebView
 * below the system status bar so headers aren't covered by the clock/icons.
 */
export function NativeChrome() {
  const pathname = usePathname();

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

    const admin = pathname.startsWith("/admin") || pathname.startsWith("/rider");
    const bg = admin ? "#1f1d1b" : "#ffffff";

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: bg });
        await StatusBar.setStyle({ style: admin ? Style.Dark : Style.Light });
        document.documentElement.classList.remove("native-android");
      } catch {
        // Plugin missing or web — keep CSS fallback for Android.
      }
    })();
  }, [pathname]);

  return null;
}
