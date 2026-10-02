import { cartCookie, readUserId, setCartCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { ensureCart, reorder } from "@/lib/store";

export const POST = handle(async (_req, ctx) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const existing = await cartCookie();
  const cart = ensureCart(existing, userId);
  if (cart.id !== existing) await setCartCookie(cart.id);
  const { id } = await ctx.params;
  return reorder(userId, id, cart.id);
});
