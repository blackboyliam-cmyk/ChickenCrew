import { readPaymentUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { createRazorpayOrder } from "@/lib/razorpay";
import { attachRazorpayOrder, getOrderForUser, getPublicSettings } from "@/lib/store";
import { cleanText } from "@/lib/validators";

/**
 * Loads everything the /pay page needs. Works with a session cookie OR a payment token
 * (Chrome Custom Tabs from the Android app don't share the WebView login cookie).
 */
export const POST = handle(async (req) => {
  const body = await readJson(req);
  const orderId = cleanText(body.orderId, 80);
  const paymentToken = cleanText(body.paymentToken, 500);
  if (!orderId) throw new ApiError(400, "Missing order.");
  const userId = await readPaymentUserId(orderId, paymentToken);
  if (!userId) throw new ApiError(401, "Please log in to continue.");

  const order = getOrderForUser(userId, orderId);
  if (order.paymentMethod !== "razorpay") throw new ApiError(400, "This order is not an online payment.");
  if (order.paymentStatus === "paid") return { alreadyPaid: true, order };
  if (order.status === "cancelled") throw new ApiError(400, "This order was cancelled.");

  const keyId = process.env.RAZORPAY_KEY_ID || "";
  if (!keyId) throw new ApiError(503, "Online payment is not available right now.");

  let razorpayOrderId = order.razorpayOrderId || "";
  if (!razorpayOrderId) {
    const gateway = await createRazorpayOrder(order.total, order.number);
    const saved = attachRazorpayOrder(order.id, gateway.razorpayOrderId, order.total);
    razorpayOrderId = saved.razorpayOrderId || gateway.razorpayOrderId;
  }

  const settings = getPublicSettings();
  return {
    keyId,
    razorpayOrderId,
    amount: order.total,
    currency: "INR",
    shopName: settings.name,
    order: {
      id: order.id,
      number: order.number,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      address: order.address,
    },
  };
});
