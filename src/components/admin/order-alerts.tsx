"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

/** Fired on window when new orders arrive, so open admin pages can refresh. */
export const NEW_ORDERS_EVENT = "cc:new-orders";

const SOUND_KEY = "cc-admin-sound";

type FeedOrder = { id: string; number: string; total: number; name: string; createdAt: string };

export function OrderAlerts() {
  const router = useRouter();
  const pathname = usePathname();
  const [sound, setSound] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const soundOn = useRef(true);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const unlockAudio = useCallback(() => {
    try {
      audio.current ||= new AudioContext();
      void audio.current.resume();
    } catch {
      audio.current = null;
    }
  }, []);

  const chime = useCallback(() => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running") return;
    const start = ctx.currentTime;
    [880, 1175, 1568].forEach((frequency, index) => {
      const at = start + index * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.55);
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY) !== "off";
    soundOn.current = stored;
    setSound(stored);
    // Browsers only allow audio after the user has interacted with the page.
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [unlockAudio]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const { orders } = await api<{ orders: FeedOrder[] }>("/api/admin/order-feed");
        if (stopped) return;
        setWaiting(orders.length);
        const base = document.title.replace(/^\(\d+\) /, "");
        document.title = orders.length ? `(${orders.length}) ${base}` : base;
        if (seen.current) {
          const fresh = orders.filter((order) => !seen.current!.has(order.id));
          if (fresh.length) {
            if (soundOn.current) chime();
            window.dispatchEvent(new Event(NEW_ORDERS_EVENT));
            for (const order of fresh.slice(0, 3)) {
              toast(`New order #${order.number}`, {
                description: `${order.name} · ${formatINR(order.total)}`,
                duration: 20000,
                action: { label: "View", onClick: () => router.push(`/admin/orders?open=${order.id}`) },
              });
            }
            if (document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
              new Notification(fresh.length === 1 ? `New order #${fresh[0].number}` : `${fresh.length} new orders`, {
                body: fresh.map((order) => `${order.name} · ${formatINR(order.total)}`).join("\n"),
                tag: "cc-new-order",
              });
            }
          }
        }
        seen.current = new Set([...(seen.current ?? []), ...orders.map((order) => order.id)]);
      } catch {
        // Try again on the next tick.
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 20000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [chime, router]);

  function toggleSound() {
    const next = !sound;
    soundOn.current = next;
    setSound(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) {
      unlockAudio();
      setTimeout(chime, 50);
      if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
      toast.success("You'll hear a chime for new orders. Keep this tab open.");
    }
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-40 flex items-center gap-2 print:hidden",
        pathname.startsWith("/admin/settings") ? "bottom-24" : "bottom-4",
      )}
    >
      {waiting > 0 && (
        <Link
          href="/admin/orders"
          className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white shadow-float hover:bg-primary-dark"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          {waiting} new {waiting === 1 ? "order" : "orders"}
        </Link>
      )}
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={sound}
        title={sound ? "New-order sound is on" : "New-order sound is off"}
        className={cn(
          "grid size-10 place-items-center rounded-full border bg-white shadow-float transition-colors hover:bg-muted",
          !sound && "text-muted-foreground",
        )}
      >
        {sound ? <Bell className="size-4.5" /> : <BellOff className="size-4.5" />}
        <span className="sr-only">{sound ? "Turn off new-order sound" : "Turn on new-order sound"}</span>
      </button>
    </div>
  );
}
