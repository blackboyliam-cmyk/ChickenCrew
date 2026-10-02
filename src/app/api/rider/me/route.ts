import { readRiderId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { getActiveRider, riderDashboard } from "@/lib/store";

export const GET = handle(async () => {
  const rider = getActiveRider(await readRiderId());
  if (!rider) throw new ApiError(401, "Please sign in to the rider app.");
  return riderDashboard(rider.id);
});
