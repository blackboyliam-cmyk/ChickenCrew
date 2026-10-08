import "server-only";
import webpush from "web-push";
import type { PushSubscriptionRecord } from "./types";

export type PushMessage = { title: string; body: string; url: string; tag: string };

export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Sends to every saved device and returns the endpoints the browser has dropped. */
export async function sendPush(subscriptions: PushSubscriptionRecord[], message: PushMessage): Promise<string[]> {
  if (!pushConfigured() || subscriptions.length === 0) return [];
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:karthikachickencentre@gmail.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const payload = JSON.stringify(message);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
        TTL: 60 * 60,
        urgency: "high",
        timeout: 8000,
      }),
    ),
  );
  const gone: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const status = (result.reason as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) gone.push(subscriptions[index].endpoint);
    else console.error("Order alert push failed", status, (result.reason as Error)?.message);
  });
  return gone;
}
