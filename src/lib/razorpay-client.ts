import { api, ApiClientError } from "@/lib/api-client";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new ApiClientError("Payment could not be started. Please try again."));
    document.body.appendChild(script);
  });
}

/** Opens Razorpay for an existing unpaid order. Resolves true once the payment is verified, false if the customer closes it. */
export async function payExistingOrder(input: { orderId: string; number: string; shopName: string; name: string; phone: string; email: string }) {
  const payment = await api<{ keyId: string; razorpayOrderId: string; amount: number; currency: string; alreadyPaid?: boolean }>(
    "/api/payment/create",
    { method: "POST", body: { orderId: input.orderId } },
  );
  if (payment.alreadyPaid) return true;
  await loadRazorpay();
  if (!window.Razorpay) throw new ApiClientError("Payment could not be started. Please try again.");
  return new Promise<boolean>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: input.shopName,
      description: input.number,
      order_id: payment.razorpayOrderId,
      prefill: { name: input.name, contact: input.phone, email: input.email },
      theme: { color: "#b91c1c" },
      handler: (response: RazorpayResponse) => {
        api("/api/payment/verify", { method: "POST", body: { orderId: input.orderId, ...response } }).then(() => resolve(true), reject);
      },
      modal: { ondismiss: () => resolve(false) },
    });
    checkout.open();
  });
}
