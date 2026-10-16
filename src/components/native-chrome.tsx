"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PERMS_ASKED_KEY = "cc-native-perms-asked";

/**
 * Capacitor shell: status bar insets + first-launch permission prompts
 * (location for delivery pin, notifications for order alerts).
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

      // Ask once per install so map pin + order alerts can work.
      try {
        if (localStorage.getItem(PERMS_ASKED_KEY) === "1") return;
        localStorage.setItem(PERMS_ASKED_KEY, "1");

        const { Geolocation } = await import("@capacitor/geolocation");
        await Geolocation.requestPermissions();

        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.requestPermissions();

        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch {
        // User denied or plugin unavailable — site keeps working without them.
      }
    })();
  }, [pathname]);

  return null;
}
