"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { LiveMap, type MapPoint } from "@/components/maps/live-map";
import { api } from "@/lib/api-client";
import { distanceMeters, etaMinutes, formatDistance, placeUrl, type LatLng } from "@/lib/maps";
import type { RiderLocation } from "@/lib/types";

type Tracking = { status: string; rider: { name: string; phone: string } | null; destination: LatLng | null; location: RiderLocation | null };

function ago(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min ago`;
}

/** Live rider position for an order that is out for delivery. Polls every 10 seconds. */
export function OrderTracking({ orderId, code }: { orderId: string; code: string | null }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);

  useEffect(() => {
    let stopped = false;
    const tick = () =>
      api<Tracking>(`/api/orders/${orderId}/tracking`)
        .then((data) => !stopped && setTracking(data))
        .catch(() => undefined);
    void tick();
    const timer = setInterval(tick, 10000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId]);

  const location = tracking?.location || null;
  const destination = tracking?.destination || null;
  const meters = location && destination ? distanceMeters(location, destination) : null;
  const points: MapPoint[] = [
    ...(location ? [{ id: "rider", lat: location.lat, lng: location.lng, kind: "rider" as const, title: tracking?.rider?.name || "Rider" }] : []),
    ...(destination ? [{ id: "home", lat: destination.lat, lng: destination.lng, kind: "home" as const, title: "Your address" }] : []),
  ];

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border bg-card" aria-labelledby="live-title">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 id="live-title" className="flex items-center gap-2 text-base font-bold">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            On the way to you
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {meters != null
              ? `${formatDistance(meters)} away · about ${etaMinutes(meters)} min`
              : location
                ? `Rider location updated ${ago(location.at)}`
                : "The map appears once the rider shares their location."}
          </p>
        </div>
        {tracking?.rider && (
          <a
            href={`tel:+91${tracking.rider.phone}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark"
          >
            <Phone className="size-4" /> Call {tracking.rider.name.split(" ")[0]}
          </a>
        )}
      </div>

      {location && (
        <LiveMap
          className="mx-5 h-64 md:h-72"
          points={points}
          fallback={
            <a
              href={placeUrl(location)}
              target="_blank"
              rel="noreferrer"
              className="mx-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed py-4 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              <MapPin className="size-4" /> See the rider on Google Maps
            </a>
          }
        />
      )}

      {code && (
        <div className="m-5 flex items-center justify-between gap-4 rounded-2xl bg-charcoal px-5 py-4 text-white">
          <div>
            <p className="text-sm font-bold">Delivery code</p>
            <p className="text-xs text-white/65">Tell this to the rider when your order arrives.</p>
          </div>
          <p className="font-mono text-3xl font-black tracking-[0.25em]">{code}</p>
        </div>
      )}
    </section>
  );
}
