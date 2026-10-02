import { cartCookie, readUserId } from "@/lib/auth";
import { handle, readJson } from "@/lib/http";
import { deliveryQuote, getCart, getUser, quoteCoupon } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const code = cleanText(body.code, 30);
  const userId = await readUserId();
  const user = userId ? getUser(userId) : null;
  const cart = getCart(await cartCookie());
  const coupon = quoteCoupon(code, cart.subtotal, user?.phone || null);
  if (!coupon.ok) return { ...coupon, deliveryFee: deliveryQuote(cart.subtotal, 0).deliveryFee, total: cart.subtotal + deliveryQuote(cart.subtotal, 0).deliveryFee };
  const delivery = deliveryQuote(cart.subtotal, coupon.discount);
  return { ...coupon, ...delivery, subtotal: cart.subtotal };
});
