import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { createRazorpayOrder } from "@/lib/razorpay";
import { attachRazorpayOrder, getOrderForUser } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const body = await readJson(req);
  const order = getOrderForUser(userId, cleanText(body.orderId, 80));
  if (order.paymentMethod !== "razorpay") throw new ApiError(400, "This order is not an online payment.");
  if (order.paymentStatus === "paid") return { alreadyPaid: true, order };
  if (order.status === "cancelled") throw new ApiError(400, "This order was cancelled.");
  if (order.razorpayOrderId) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.total,
      currency: "INR",
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
    order: saved,
  };
});
