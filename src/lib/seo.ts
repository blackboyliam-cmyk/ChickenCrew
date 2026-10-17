import type { ShopSettings } from "@/lib/types";

const DEFAULT_SITE_URL = "https://karthikachickencentre.shop";

/** Canonical public site origin (no trailing slash). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

/** Absolute URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Rich LocalBusiness / FoodEstablishment JSON-LD for the shop home page. */
export function localBusinessJsonLd(settings: ShopSettings): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["FoodEstablishment", "LocalBusiness"],
    name: settings.name,
    url: siteUrl(),
    brand: settings.brand,
    image: absoluteUrl("/icon-512.png"),
    areaServed: [
      { "@type": "City", name: "Dombivili" },
      { "@type": "City", name: "Thakurli" },
    ],
  };

  if (settings.phone) data.telephone = settings.phone;
  if (settings.email) data.email = settings.email;

  const street = [settings.addressLine, settings.area].filter(Boolean).join(", ");
  if (street || settings.city || settings.pincode) {
    data.address = {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      ...(settings.city ? { addressLocality: settings.city } : {}),
      ...(settings.state ? { addressRegion: settings.state } : {}),
      ...(settings.pincode ? { postalCode: settings.pincode } : {}),
      addressCountry: "IN",
    };
  }

  if (settings.googleReviewsUrl) data.sameAs = [settings.googleReviewsUrl];
  if (settings.hours?.trim()) data.openingHours = settings.hours.trim();

  return data;
}
