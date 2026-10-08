"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, errorText } from "@/components/admin/forms";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

type Status = { configured: boolean; publicKey: string; devices: number };
type Support = "checking" | "ok" | "ios-browser" | "unsupported";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android phone";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Mac/.test(ua)) return "Mac";
  return "This device";
}

export function PhoneAlerts() {
  const [status, setStatus] = useState<Status | null>(null);
  const [support, setSupport] = useState<Support>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api<Status>("/api/admin/push"));
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupport(ios && !standalone ? "ios-browser" : "unsupported");
      return;
    }
    setSupport("ok");
    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => setEndpoint(null));
  }, [refresh]);

  async function turnOn() {
    if (!status?.publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked. Allow them for this site in your phone's settings, then try again.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) }));
      await api("/api/admin/push", { body: { ...sub.toJSON(), device: deviceName() } });
      setEndpoint(sub.endpoint);
      await refresh();
      toast.success("Order alerts are on for this device.");
    } catch (err) {
      toast.error(err instanceof Error && !("status" in err) ? "This browser couldn't turn on alerts." : errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!endpoint) return;
    setBusy(true);
    try {
      await api("/api/admin/push", { body: { action: "test", endpoint } });
      toast.success("Test sent. It should pop up in a few seconds.");
    } catch (err) {
      toast.error(errorText(err));
      if ((err as { status?: number }).status === 410) setEndpoint(null);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!endpoint) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
      await api("/api/admin/push", { method: "DELETE", body: { endpoint } });
      setEndpoint(null);
      await refresh();
      toast.success("Order alerts are off for this device.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const on = Boolean(endpoint);
  const devices = status?.devices ?? 0;

  return (
    <Panel
      title="Order alerts on this phone"
      description={devices ? `${devices} ${devices === 1 ? "device gets" : "devices get"} alerts` : "Get a notification for every new order and delivery"}
    >
      <div className="space-y-3 text-sm">
        {support === "checking" || !status ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking this device…
          </p>
        ) : !status.configured ? (
          <p className="text-muted-foreground">Phone alerts aren&apos;t set up on the server yet.</p>
        ) : support === "ios-browser" ? (
          <p className="text-muted-foreground">
            On iPhone, tap <b>Share</b> → <b>Add to Home Screen</b>, open the shop from that new icon, sign in and come back here to turn alerts on.
          </p>
        ) : support === "unsupported" ? (
          <p className="text-muted-foreground">This browser can&apos;t show phone alerts. Try Chrome on Android, or Safari on iPhone from the home screen.</p>
        ) : (
          <>
            <p className="flex items-start gap-2">
              <BellRing className={`mt-0.5 size-4 shrink-0 ${on ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span>
                {on
                  ? "Alerts are on. You'll be notified of new orders and when a rider delivers with the customer's PIN, even when this site is closed."
                  : "Turn this on with the phone you keep at the shop. You'll be notified even when this site is closed."}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {on ? (
                <>
                  <Button size="sm" onClick={() => void sendTest()} disabled={busy}>
                    Send test alert
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void turnOff()} disabled={busy}>
                    Turn off
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => void turnOn()} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Turn on alerts
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
