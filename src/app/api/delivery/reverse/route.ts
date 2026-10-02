import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { isPincode } from "@/lib/validators";

export const POST = handle(async (req) => {
  rateLimit(`geo:${clientIp(req)}`, 20, 10 * 60 * 1000);
  const body = await readJson(req);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new ApiError(400, "Location could not be read.");
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "ChickenCrew/1.0 (karthikachickencentre.shop)", Accept: "application/json" },
  }).catch(() => null);
  if (!response || !response.ok) {
    throw new ApiError(400, "Could not read a pincode from this location. Enter it manually.");
  }
  const data = (await response.json()) as { address?: { postcode?: string } };
  const pin = String(data.address?.postcode || "").replace(/\s/g, "");
  if (!isPincode(pin)) {
    throw new ApiError(400, "Could not read a pincode from this location. Enter it manually.");
  }
  return { pincode: pin };
});
