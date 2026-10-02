import { readRiderId } from "@/lib/auth";
import { saveRiderLocation } from "@/lib/db-backend";
import { ApiError } from "@/lib/errors";
import { assertSameOrigin, json } from "@/lib/http";

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

// Skips withDb on purpose: pings are frequent and only touch the rider_locations collection.
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const riderId = await readRiderId();
    if (!riderId) throw new ApiError(401, "Please sign in to the rider app.");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const lat = num(body.lat);
    const lng = num(body.lng);
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError(400, "Location could not be read.");
    await saveRiderLocation(riderId, {
      lat,
      lng,
      accuracy: num(body.accuracy),
      heading: num(body.heading),
      speed: num(body.speed),
      at: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
