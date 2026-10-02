import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { cancelOrder } from "@/lib/store";

export const POST = handle(async (_req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const { id } = await ctx.params;
  return { order: cancelOrder(userId, id) };
});
