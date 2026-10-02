import { cartCookie, readUserId, setCartCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { createOrder, ensureCart, listOrders } from "@/lib/store";
import { cleanText } from "@/lib/validators";
import type { AddressInput } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

export const GET = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const filter = new URL(req.url).searchParams.get("filter") || "all";
  return { orders: listOrders(userId, filter) };
});

export const POST = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const existing = await cartCookie();
  const cart = ensureCart(existing, userId);
  if (cart.id !== existing) await setCartCookie(cart.id);
  const body = await readJson(req);
  const method = body.paymentMethod === "razorpay" ? "razorpay" : "cod";
  const seen = (body.seenPrices || {}) as Record<string, number>;
  const order = createOrder({
    cartId: cart.id,
    userId,
    name: cleanText(body.name, 80),
    email: cleanText(body.email, 120),
    address: (body.address || {}) as AddressInput,
    saveAddress: Boolean(body.saveAddress),
    slotDate: cleanText(body.slotDate, 10),
    slotTemplateId: cleanText(body.slotTemplateId, 40),
    couponCode: cleanText(body.couponCode, 30),
    paymentMethod: method as PaymentMethod,
    seenPrices: seen,
    idempotencyKey: cleanText(body.idempotencyKey, 80) || crypto.randomUUID(),
  });
  return { order };
});
