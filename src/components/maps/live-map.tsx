"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MAPS_KEY, mapsLibs, onMapsAuthFailure } from "@/lib/maps";
import { cn } from "@/lib/utils";

export type MapPoint = { id: string; lat: number; lng: number; kind: "rider" | "home"; title: string };

type Libs = Awaited<ReturnType<typeof mapsLibs>>;

function icon(libs: Libs, kind: MapPoint["kind"]): google.maps.Symbol {
  return kind === "rider"
    ? { path: libs.SymbolPath.CIRCLE, scale: 15, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#b91c1c", strokeWeight: 3 }
    : { path: libs.SymbolPath.CIRCLE, scale: 9, fillColor: "#b91c1c", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 };
}

/** Shows riders and drop-off points; renders `fallback` when Google Maps isn't available. */
export function LiveMap({ points, className, fallback }: { points: MapPoint[]; className?: string; fallback?: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const libs = useRef<Libs | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef(new Map<string, google.maps.Marker>());
  const framed = useRef("");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!MAPS_KEY);

  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    const stop = onMapsAuthFailure(() => setFailed(true));
    mapsLibs()
      .then((loaded) => {
        if (cancelled || !box.current) return;
        libs.current = loaded;
        map.current = new loaded.Map(box.current, {
          center: { lat: 22.5, lng: 79 },
          zoom: 5,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  useEffect(() => {
    const l = libs.current;
    if (!ready || !l || !map.current) return;
    const seen = new Set<string>();
    for (const point of points) {
      seen.add(point.id);
      const position = { lat: point.lat, lng: point.lng };
      const existing = markers.current.get(point.id);
      if (existing) existing.setPosition(position);
      else {
        markers.current.set(
          point.id,
          new l.Marker({
            map: map.current,
            position,
            title: point.title,
            icon: icon(l, point.kind),
            label: point.kind === "rider" ? { text: "🛵", fontSize: "17px" } : undefined,
            zIndex: point.kind === "rider" ? 2 : 1,
          }),
        );
      }
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markers.current.delete(id);
      }
    }
    // Re-frame only when the set of markers changes, so the map doesn't jump on every ping.
    const key = points.map((point) => point.id).sort().join("|");
    if (key && key !== framed.current) {
      framed.current = key;
      if (points.length === 1) {
        map.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.current.setZoom(15);
      } else {
        const bounds = new l.LatLngBounds();
        points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
        map.current.fitBounds(bounds, 56);
      }
    }
  }, [points, ready]);

  if (failed) return <>{fallback ?? null}</>;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-muted", className)}>
      <div ref={box} className="size-full" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </div>
  );
}
