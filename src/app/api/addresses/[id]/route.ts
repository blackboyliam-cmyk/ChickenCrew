import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { deleteAddress, updateAddress, type AddressInput } from "@/lib/store";

export const PUT = handle(async (req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const { id } = await ctx.params;
  return { address: updateAddress(userId, id, (await readJson(req)) as AddressInput) };
});

export const DELETE = handle(async (_req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const { id } = await ctx.params;
  return deleteAddress(userId, id);
});
