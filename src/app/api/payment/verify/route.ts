import { readPaymentUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getOrderForUser, markOrderPaid } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const orderId = cleanText(body.orderId, 80);
  if (!orderId) throw new ApiError(400, "Missing order.");
  const userId = await readPaymentUserId(orderId, cleanText(body.paymentToken, 500));
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const razorpayOrderId = cleanText(body.razorpay_order_id, 80);
  const razorpayPaymentId = cleanText(body.razorpay_payment_id, 80);
  const signature = cleanText(body.razorpay_signature, 200);
  const order = getOrderForUser(userId, orderId);
  if (order.paymentStatus === "paid") return { order };
  if (!razorpayOrderId || !razorpayPaymentId || !signature) throw new ApiError(400, "Payment could not be verified.");
  if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
    throw new ApiError(400, "Payment could not be verified.");
  }
  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature)) {
    throw new ApiError(400, "Payment could not be verified.");
  }
  return { order: markOrderPaid(razorpayOrderId, razorpayPaymentId) };
});
