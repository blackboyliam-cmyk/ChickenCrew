"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { MAPS_KEY, addressFromComponents, mapsLibs, onMapsAuthFailure, type AddressParts, type LatLng } from "@/lib/maps";
import { cn } from "@/lib/utils";

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };
type Libs = Awaited<ReturnType<typeof mapsLibs>>;

const INDIA = { lat: 22.5, lng: 79 };

function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This device can't share its location."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(new Error(error.code === error.PERMISSION_DENIED ? "Location access is blocked. Allow it in your browser settings." : "Couldn't find your location. Try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

/**
 * Lets the customer pin their exact door on a map. Without a Maps key it still captures GPS
 * coordinates, which is enough for the rider's navigation link.
 */
export function MapPicker({
  value,
  onChange,
  onAddress,
  hint,
}: {
  value: LatLng | null;
  onChange: (pin: LatLng | null) => void;
  onAddress?: (parts: AddressParts) => void;
  /** Where to centre the map before anything is pinned, e.g. the delivery pincode. */
  hint?: string;
}) {
  const [mapsFailed, setMapsFailed] = useState(!MAPS_KEY);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  async function locate(apply: (pin: LatLng) => void) {
    setError("");
    setLocating(true);
    try {
      apply(await currentPosition());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't find your location.");
    } finally {
      setLocating(false);
    }
  }

  if (mapsFailed) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3.5">
        {value ? (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <Check className="size-4" /> Exact location pinned
            </p>
            <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void locate(onChange)}
            disabled={locating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5 disabled:opacity-60"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            I&apos;m at this address now: pin my location
          </button>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Helps the rider find your door. Optional.</p>
      </div>
    );
  }

  return <GoogleMapPicker value={value} onChange={onChange} onAddress={onAddress} hint={hint} onFail={() => setMapsFailed(true)} locate={locate} locating={locating} error={error} />;
}

function GoogleMapPicker({
  value,
  onChange,
  onAddress,
  hint,
  onFail,
  locate,
  locating,
  error,
}: {
  value: LatLng | null;
  onChange: (pin: LatLng | null) => void;
  onAddress?: (parts: AddressParts) => void;
  hint?: string;
  onFail: () => void;
  locate: (apply: (pin: LatLng) => void) => Promise<void>;
  locating: boolean;
  error: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const libs = useRef<Libs | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const callbacks = useRef({ onChange, onAddress });
  callbacks.current = { onChange, onAddress };
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  function place(pin: LatLng, opts: { geocode: boolean; zoom?: boolean }) {
    const l = libs.current;
    if (!l || !map.current) return;
    if (!marker.current) {
      marker.current = new l.Marker({ map: map.current, position: pin, draggable: true });
      marker.current.addListener("dragend", () => {
        const at = marker.current?.getPosition();
        if (at) place({ lat: at.lat(), lng: at.lng() }, { geocode: true });
      });
    } else marker.current.setPosition(pin);
    map.current.panTo(pin);
    if (opts.zoom) map.current.setZoom(17);
    callbacks.current.onChange(pin);
    if (opts.geocode && callbacks.current.onAddress) {
      new l.Geocoder()
        .geocode({ location: pin })
        .then(({ results }) => {
          const first = results[0];
          if (first) callbacks.current.onAddress?.(addressFromComponents(first.address_components.map((c) => ({ types: c.types, long: c.long_name }))));
        })
        .catch(() => undefined);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const stop = onMapsAuthFailure(onFail);
    mapsLibs()
      .then(async (loaded) => {
        if (cancelled || !box.current) return;
        libs.current = loaded;
        map.current = new loaded.Map(box.current, {
          center: value || INDIA,
          zoom: value ? 17 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        map.current.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) place({ lat: event.latLng.lat(), lng: event.latLng.lng() }, { geocode: true });
        });
        if (value) place(value, { geocode: false });
        else if (hint) {
          const { results } = await new loaded.Geocoder().geocode({ address: hint, region: "in" }).catch(() => ({ results: [] }));
          const at = results[0]?.geometry.location;
          if (at && !cancelled && !marker.current) {
            map.current.setCenter(at);
            map.current.setZoom(14);
          }
        }
        setReady(true);
      })
      .catch(onFail);
    return () => {
      cancelled = true;
      stop();
    };
    // The map is created once; later pins go through place().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const l = libs.current;
    if (!l || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      token.current ||= new l.places.AutocompleteSessionToken();
      const center = map.current?.getCenter();
      l.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken: token.current,
        includedRegionCodes: ["in"],
        ...(center && map.current!.getZoom()! > 6 ? { locationBias: { center, radius: 30000 } } : {}),
      })
        .then(({ suggestions: found }) =>
          setSuggestions(
            found.flatMap((s) =>
              s.placePrediction
                ? [{ id: s.placePrediction.placeId, main: s.placePrediction.mainText?.text || s.placePrediction.text.text, secondary: s.placePrediction.secondaryText?.text || "", prediction: s.placePrediction }]
                : [],
            ),
          ),
        )
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function choose(suggestion: Suggestion) {
    setSuggestions([]);
    setQuery(suggestion.main);
    const result = suggestion.prediction.toPlace();
    token.current = null;
    const { place: found } = await result.fetchFields({ fields: ["location", "addressComponents"] }).catch(() => ({ place: null }));
    const at = found?.location;
    if (!at) return;
    place({ lat: at.lat(), lng: at.lng() }, { geocode: false, zoom: true });
    if (found.addressComponents) {
      callbacks.current.onAddress?.(addressFromComponents(found.addressComponents.map((c) => ({ types: c.types, long: c.longText || "" }))));
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="relative border-b p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your building, street or area"
          aria-label="Search for your address"
          className="h-10 w-full rounded-lg bg-muted/60 pl-9 pr-9 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-2 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-white shadow-float">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button type="button" onClick={() => void choose(suggestion)} className="flex w-full gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{suggestion.main}</span>
                    <span className="block truncate text-xs text-muted-foreground">{suggestion.secondary}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative">
        <div ref={box} className="h-56 w-full bg-muted" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        <button
          type="button"
          onClick={() => void locate((pin) => place(pin, { geocode: true, zoom: true }))}
          disabled={!ready || locating}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-primary shadow-float disabled:opacity-60"
        >
          {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5" />}
          Use my location
        </button>
      </div>
      <p className={cn("px-3.5 py-2.5 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {error || (value ? "Drag the pin to your exact door. We fill in the area and pincode for you." : "Tap the map or search to drop a pin at your door.")}
      </p>
    </div>
  );
}
