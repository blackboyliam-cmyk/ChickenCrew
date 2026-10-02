import { cartCookie, readUserId, setCartCookie } from "@/lib/auth";
import { handle, readJson } from "@/lib/http";
import { deliveryQuote, ensureCart, removeCartItem, setCartQty } from "@/lib/store";

async function cartId() {
  const existing = await cartCookie();
  const cart = ensureCart(existing, await readUserId());
  if (cart.id !== existing) await setCartCookie(cart.id);
  return cart.id;
}

export const PUT = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const cart = setCartQty(await cartId(), id, Number(body.qty));
  return { cart, quote: { coupon: null, ...deliveryQuote(cart.subtotal, 0) } };
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const cart = removeCartItem(await cartId(), id);
  return { cart, quote: { coupon: null, ...deliveryQuote(cart.subtotal, 0) } };
});
