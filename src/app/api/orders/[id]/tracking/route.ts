import { readUserId } from "@/lib/auth";
import { loadRiderLocations } from "@/lib/db-backend";
import { ApiError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { getTracking } from "@/lib/store";

const FRESH_MS = 20 * 60 * 1000;

export const GET = handle(async (_req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const { id } = await ctx.params;
  const tracking = getTracking(userId, id);
  let location = null;
  if (tracking.status === "out_for_delivery" && tracking.riderId) {
    const found = (await loadRiderLocations([tracking.riderId]))[tracking.riderId];
    if (found && Date.now() - new Date(found.at).getTime() < FRESH_MS) location = found;
  }
  return { status: tracking.status, rider: tracking.rider, destination: tracking.destination, location };
});
