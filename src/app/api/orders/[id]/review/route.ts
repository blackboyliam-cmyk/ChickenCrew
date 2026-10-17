import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { submitOrderReview } from "@/lib/store";

export const POST = handle(async (req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const { id } = await ctx.params;
  const body = await readJson(req);
  return submitOrderReview(userId, id, { rating: body.rating, comment: body.comment });
});
