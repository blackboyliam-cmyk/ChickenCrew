export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type LatLng = { lat: number; lng: number };

export type AddressParts = { street: string; area: string; city: string; state: string; pincode: string };

declare global {
  interface Window {
    __ccMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

let pending: Promise<void> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

/** Google calls gm_authFailure when the key is wrong, restricted, or billing is off. */
export function onMapsAuthFailure(listener: () => void) {
  if (authFailed) listener();
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function bootstrap(): Promise<void> {
  if (!MAPS_KEY) return Promise.reject(new Error("Google Maps key is not set."));
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      window.__ccMapsReady = () => resolve();
      window.gm_authFailure = () => {
        authFailed = true;
        authListeners.forEach((listener) => listener());
      };
      const params = new URLSearchParams({ key: MAPS_KEY, v: "weekly", loading: "async", callback: "__ccMapsReady", region: "IN", language: "en" });
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.onerror = () => {
        pending = null;
        reject(new Error("Google Maps could not load."));
      };
      document.head.appendChild(script);
    });
  }
  return pending;
}

export async function mapsLibs() {
  await bootstrap();
  const [maps, marker, core, geocoding, places] = await Promise.all([
    google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
    google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
    google.maps.importLibrary("core") as Promise<google.maps.CoreLibrary>,
    google.maps.importLibrary("geocoding") as Promise<google.maps.GeocodingLibrary>,
    google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
  ]);
  return { Map: maps.Map, Marker: marker.Marker, LatLngBounds: core.LatLngBounds, SymbolPath: core.SymbolPath, Geocoder: geocoding.Geocoder, places };
}

type Component = { types: string[]; long: string };

export function addressFromComponents(components: Component[]): AddressParts {
  const get = (...types: string[]) => {
    for (const type of types) {
      const hit = components.find((component) => component.types.includes(type));
      if (hit?.long) return hit.long;
    }
    return "";
  };
  return {
    street: get("route", "sublocality_level_2", "sublocality_level_3"),
    area: get("sublocality_level_1", "sublocality", "neighborhood", "sublocality_level_2"),
    city: get("locality", "administrative_area_level_3", "administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    pincode: get("postal_code").replace(/\s/g, ""),
  };
}

/** Straight-line distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Rough arrival time for a two-wheeler in city traffic; roads add about 30% to the straight line. */
export function etaMinutes(meters: number) {
  return Math.max(2, Math.round(((meters * 1.3) / 1000 / 18) * 60));
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function directionsUrl(destination: LatLng | string) {
  const target = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=two-wheeler`;
}

export function placeUrl(point: LatLng) {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}
