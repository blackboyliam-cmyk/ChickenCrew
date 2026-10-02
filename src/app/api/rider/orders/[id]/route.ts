import { readRiderId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, rateLimit, readJson } from "@/lib/http";
import { getActiveRider, riderUpdateOrder } from "@/lib/store";

export const POST = handle(async (req, ctx) => {
  const rider = getActiveRider(await readRiderId());
  if (!rider) throw new ApiError(401, "Please sign in to the rider app.");
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (body.action === "deliver") rateLimit(`rider-code:${rider.id}:${id}`, 8, 10 * 60 * 1000);
  return { order: riderUpdateOrder(rider.id, id, body) };
});
