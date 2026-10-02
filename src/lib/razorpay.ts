import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { ApiError } from "./errors";

function keys() {
  const id = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!id || !secret) throw new ApiError(503, "Online payment is not available right now.");
  return { id, secret };
}

export async function createRazorpayOrder(amount: number, receipt: string) {
  const { id, secret } = keys();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt, payment_capture: 1 }),
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!response.ok || !data.id) {
    throw new ApiError(502, "Payment could not be started. Please try again.");
  }
  return { razorpayOrderId: data.id, keyId: id, amount };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const { secret } = keys();
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
