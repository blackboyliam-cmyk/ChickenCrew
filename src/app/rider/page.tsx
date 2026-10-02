"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Check, Loader2, LogOut, MapPinOff, MessageCircle, Navigation, Phone, RefreshCw, Smartphone } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { directionsUrl } from "@/lib/maps";
import { formatINR } from "@/lib/money";
import type { Address, Collection, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";

type RiderOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  slot: { date: string; label: string };
  address: Omit<Address, "id" | "userId">;
  items: { name: string; weight: string; qty: number }[];
  total: number;
  paymentMethod: "cod" | "razorpay";
  due: number;
  needsCode: boolean;
  deliveredAt: string | null;
  collection: Collection | null;
};

type Dashboard = {
  rider: { id: string; name: string; phone: string };
  orders: RiderOrder[];
  delivered: RiderOrder[];
  cashInHand: number;
  shopPhone: string;
};

type GeoState = "off" | "starting" | "on" | "denied" | "unsupported";

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "New",
  confirmed: "Confirmed",
  preparing: "Being packed",
  ready: "Ready to pick up",
  out_for_delivery: "On the way",
};

const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" });

function addressText(address: RiderOrder["address"]) {
  return [address.house, address.building, address.street, address.area, address.city].filter(Boolean).join(", ") + ` ${address.pincode}`;
}

/** Sends the rider's position while they have a delivery on the way. */
function useLocationSharing(active: boolean) {
  const [state, setState] = useState<GeoState>("off");
  const last = useRef<{ position: GeolocationPosition; sentAt: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setState("off");
      return;
    }
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("starting");
    let latest: GeolocationPosition | null = null;
    const send = (position: GeolocationPosition) => {
      last.current = { position, sentAt: Date.now() };
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      void api("/api/rider/location", {
        method: "POST",
        body: { lat: latitude, lng: longitude, accuracy, heading, speed },
      }).catch(() => undefined);
    };
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        latest = position;
        setState("on");
        if (!last.current || Date.now() - last.current.sentAt > 15000) send(position);
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? "denied" : "starting"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    // A rider waiting at a door doesn't move, so watchPosition goes quiet; keep the last fix fresh.
    const timer = setInterval(() => {
      if (latest && (!last.current || Date.now() - last.current.sentAt > 30000)) send(latest);
    }, 10000);

    let lock: WakeLockSentinel | null = null;
    const keepAwake = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => undefined);
    };
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);

    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", keepAwake);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);

  return state;
}

export default function RiderPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Dashboard>("/api/rider/me"));
      setError("");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/rider/login");
        return;
      }
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const onTheWay = Boolean(data?.orders.some((order) => order.status === "out_for_delivery"));
  const geo = useLocationSharing(onTheWay);

  async function signOut() {
    await api("/api/rider/logout", { method: "POST", body: {} }).catch(() => undefined);
    router.replace("/rider/login");
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        {error ? (
          <div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 text-sm font-semibold text-primary">
              Try again
            </button>
          </div>
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg pb-10">
      <header className="sticky top-0 z-20 bg-charcoal px-4 pt-4 pb-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/55">ChickenCrew rider</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">Hi, {data.rider.name.split(" ")[0]}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4.5", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["To deliver", String(data.orders.length)],
            ["Delivered today", String(data.delivered.length)],
            ["Cash with you", formatINR(data.cashInHand)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/8 px-3 py-2.5">
              <p className="text-[11px] text-white/55">{label}</p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </header>

      {onTheWay && (
        <div
          className={cn(
            "mx-4 mt-4 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm",
            geo === "on" ? "bg-success/10 text-success" : geo === "starting" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-[#92400e]",
          )}
          role="status"
        >
          {geo === "on" ? (
            <>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              Sharing your location with the customer. Keep this screen open.
            </>
          ) : geo === "starting" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Finding your location…
            </>
          ) : (
            <>
              <MapPinOff className="size-4 shrink-0" />
              {geo === "denied"
                ? "Location is blocked. Allow location for this site in your browser settings so customers can track you."
                : "This browser can't share location."}
            </>
          )}
        </div>
      )}

      {error && <p className="mx-4 mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <section className="mt-4 space-y-3 px-4" aria-label="Deliveries">
        {data.orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
            <p className="font-bold">No deliveries right now</p>
            <p className="mt-1 text-sm text-muted-foreground">New orders show up here as soon as the shop assigns them to you.</p>
          </div>
        ) : (
          data.orders.map((order) => <DeliveryCard key={order.id} order={order} onChange={load} />)
        )}
      </section>

      {data.delivered.length > 0 && (
        <section className="mt-8 px-4" aria-labelledby="done-title">
          <h2 id="done-title" className="text-sm font-bold">
            Delivered today
          </h2>
          <ul className="mt-2 divide-y rounded-2xl border bg-card">
            {data.delivered.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{order.address.name}</span>
                  <span className="text-xs text-muted-foreground">
                    #{order.number}
                    {order.deliveredAt && ` · ${time.format(new Date(order.deliveredAt))}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{formatINR(order.total)}</span>
                  <span className="text-xs text-muted-foreground">
                    {order.collection ? (order.collection.mode === "cash" ? "Cash" : "UPI") : "Prepaid"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.shopPhone && (
        <a href={`tel:${data.shopPhone}`} className="mx-4 mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <Phone className="size-4" /> Call the shop
        </a>
      )}
    </main>
  );
}

function DeliveryCard({ order, onChange }: { order: RiderOrder; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"cash" | "upi" | null>(null);
  const [error, setError] = useState("");
  const onTheWay = order.status === "out_for_delivery";
  const address = order.address;
  const pinned = address.lat != null && address.lng != null;
  const destination = pinned ? { lat: address.lat!, lng: address.lng! } : addressText(address);
  const canFinish = (!order.needsCode || code.length === 4) && (order.due === 0 || mode !== null);

  async function act(action: "start" | "deliver") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/rider/orders/${order.id}`, { method: "POST", body: { action, code, mode } });
      toast.success(action === "start" ? "Delivery started. Customer can now track you." : `Order #${order.number} delivered.`);
      setFinishing(false);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={cn("overflow-hidden rounded-3xl border bg-card shadow-card", onTheWay && "border-primary/40")}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
              onTheWay ? "bg-primary text-white" : "bg-muted text-muted-foreground",
            )}
          >
            {STATUS_LABEL[order.status] || order.status}
          </span>
          <span className="text-xs text-muted-foreground">
            #{order.number} · {order.slot.label}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-extrabold tracking-tight">{address.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{addressText(address)}</p>
        {address.landmark && <p className="mt-0.5 text-sm text-muted-foreground">Near {address.landmark}</p>}
        {!pinned && <p className="mt-1 text-xs text-[#92400e]">No map pin. Navigation uses the typed address.</p>}

        <p className="mt-3 text-sm">{order.items.map((item) => `${item.name} ${item.weight} × ${item.qty}`).join(", ")}</p>

        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-2xl px-4 py-3",
            order.due > 0 ? "bg-warning/15 text-[#92400e]" : "bg-success/10 text-success",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="size-4" />
            {order.due > 0 ? "Collect on delivery" : "Paid online, nothing to collect"}
          </span>
          {order.due > 0 && <span className="text-xl font-black tabular-nums">{formatINR(order.due)}</span>}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={`tel:+91${address.phone}`}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold hover:bg-muted"
          >
            <Phone className="size-4" /> Call
          </a>
          <a
            href={waLink(address.phone, `Hi ${address.name.split(" ")[0]}, this is your ChickenCrew delivery partner with order #${order.number}.`)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold hover:bg-muted"
          >
            <MessageCircle className="size-4 text-success" /> WhatsApp
          </a>
          <a
            href={directionsUrl(destination)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold hover:bg-muted"
          >
            <Navigation className="size-4 text-primary" /> Navigate
          </a>
        </div>
      </div>

      {finishing && (
        <div className="space-y-3 border-t bg-muted/40 p-4">
          {order.needsCode && (
            <label className="block">
              <span className="text-[13px] font-semibold">Delivery code from the customer</span>
              <input
                inputMode="numeric"
                autoFocus
                maxLength={4}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                className="mt-1.5 h-14 w-full rounded-xl border bg-white text-center font-mono text-2xl font-black tracking-[0.5em] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
                placeholder="••••"
              />
            </label>
          )}
          {order.due > 0 && (
            <fieldset>
              <legend className="text-[13px] font-semibold">How did they pay {formatINR(order.due)}?</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    ["cash", "Cash", Banknote],
                    ["upi", "UPI to shop", Smartphone],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-xl border bg-white text-sm font-semibold",
                      mode === value && "border-primary bg-primary/5 text-primary ring-2 ring-primary/20",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {error && <p className="border-t bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 border-t p-3">
        {!onTheWay ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("start")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-charcoal text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
            Picked up · Start delivery
          </button>
        ) : finishing ? (
          <>
            <button
              type="button"
              onClick={() => setFinishing(false)}
              className="h-12 rounded-xl border px-4 text-sm font-semibold hover:bg-muted"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || !canFinish}
              onClick={() => void act("deliver")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-success text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
              Confirm delivery
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setFinishing(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-dark"
          >
            <Check className="size-4" strokeWidth={3} /> Mark delivered
          </button>
        )}
      </div>
    </article>
  );
}
