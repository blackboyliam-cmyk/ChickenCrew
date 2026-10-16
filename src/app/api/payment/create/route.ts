import { createPaymentToken, readPaymentUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { createRazorpayOrder } from "@/lib/razorpay";
import { attachRazorpayOrder, getOrderForUser } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const orderId = cleanText(body.orderId, 80);
  if (!orderId) throw new ApiError(400, "Missing order.");
  const userId = await readPaymentUserId(orderId, cleanText(body.paymentToken, 500));
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const order = getOrderForUser(userId, orderId);
  if (order.paymentMethod !== "razorpay") throw new ApiError(400, "This order is not an online payment.");
  if (order.paymentStatus === "paid") return { alreadyPaid: true, order };
  if (order.status === "cancelled") throw new ApiError(400, "This order was cancelled.");

  const keyId = process.env.RAZORPAY_KEY_ID || "";
  if (!keyId) throw new ApiError(503, "Online payment is not available right now.");

  const paymentToken = createPaymentToken(order.id, userId);

  if (order.razorpayOrderId) {
    return {
      keyId,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.total,
      currency: "INR",
      paymentToken,
      order,
    };
  }

  const gateway = await createRazorpayOrder(order.total, order.number);
  const saved = attachRazorpayOrder(order.id, gateway.razorpayOrderId, order.total);
  return {
    keyId: gateway.keyId,
    razorpayOrderId: gateway.razorpayOrderId,
    amount: order.total,
    currency: "INR",
    paymentToken,
    order: saved,
  };
});
