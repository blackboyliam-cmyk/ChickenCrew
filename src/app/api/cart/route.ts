import { cartCookie, readUserId, setCartCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { addToCart, deliveryQuote, ensureCart, getCart, getUser, quoteCoupon } from "@/lib/store";
import { cleanText } from "@/lib/validators";

async function cartId() {
  const existing = await cartCookie();
  const userId = await readUserId();
  const cart = ensureCart(existing, userId);
  if (cart.id !== existing) await setCartCookie(cart.id);
  return cart.id;
}

export const GET = handle(async (req) => {
  const id = await cartId();
  const cart = getCart(id);
  const code = cleanText(new URL(req.url).searchParams.get("coupon"), 30);
  const userId = await readUserId();
  let quote = null;
  if (code) {
    const user = userId ? getUser(userId) : null;
    const coupon = quoteCoupon(code, cart.subtotal, user?.phone || null);
    if (!coupon.ok) quote = { coupon, deliveryFee: 0, total: cart.subtotal };
    else {
      const delivery = deliveryQuote(cart.subtotal, coupon.discount);
      quote = { coupon, ...delivery };
    }
  } else {
    quote = { coupon: null, ...deliveryQuote(cart.subtotal, 0) };
  }
  return { cart, quote };
});

export const POST = handle(async (req) => {
  const id = await cartId();
  const body = await readJson(req);
  const productId = cleanText(body.productId, 40);
  const variantId = cleanText(body.variantId, 40);
  const qty = body.qty === undefined || body.qty === null || body.qty === "" ? 1 : Number(body.qty);
  if (!productId || !variantId) throw new ApiError(400, "Choose a product.");
  if (!Number.isInteger(qty) || qty <= 0) throw new ApiError(400, "Quantity must be a positive number.");
  const cart = addToCart(id, productId, variantId, qty);
  return { cart, quote: { coupon: null, ...deliveryQuote(cart.subtotal, 0) } };
});
