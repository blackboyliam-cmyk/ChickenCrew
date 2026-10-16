import { api, ApiClientError } from "@/lib/api-client";
import { isNativeApp } from "@/lib/native";

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

/** On Android/iOS, open payment in Chrome Custom Tabs so Razorpay shows UPI. */
export async function openNativePayment(orderId: string) {
  const { Browser } = await import("@capacitor/browser");
  const url = `${window.location.origin}/pay/${orderId}`;
  await Browser.open({ url, presentationStyle: "popover" });
}

/** Poll until the customer finishes (or abandons) payment in the system browser. */
export async function waitForNativePayment(orderId: string) {
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = async (paid: boolean) => {
      if (done) return;
      done = true;
      try {
        await Browser.close();
      } catch {
        /* already closed */
      }
      void subApp.then((handle) => handle.remove());
      void subBrowser.then((handle) => handle.remove());
      window.clearInterval(timer);
      resolve(paid);
    };

    const check = async () => {
      try {
        const data = await api<{ order: { paymentStatus: string } }>(`/api/orders/${orderId}`);
        if (data.order.paymentStatus === "paid") await finish(true);
        if (data.order.paymentStatus === "failed") await finish(false);
      } catch {
        /* keep waiting */
      }
    };

    const timer = window.setInterval(() => void check(), 2000);
    const subApp = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void check();
    });
    const subBrowser = Browser.addListener("browserFinished", () => {
      void check().then(async () => {
        try {
          const data = await api<{ order: { paymentStatus: string } }>(`/api/orders/${orderId}`);
          if (data.order.paymentStatus === "paid") await finish(true);
          else {
            if (data.order.paymentStatus !== "failed") {
              await api("/api/payment/abandon", { method: "POST", body: { orderId } }).catch(() => undefined);
            }
            await finish(false);
          }
        } catch {
          await finish(false);
        }
      });
    });
  });
}

export function razorpayCheckoutOptions(input: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  orderId: string;
  razorpayOrderId: string;
  prefill: { name: string; contact: string; email: string };
  onPaid: (response: RazorpayResponse) => void;
  onCancel: () => void;
}) {
  return {
    key: input.key,
    amount: input.amount,
    currency: input.currency,
    name: input.name,
    description: input.description,
    order_id: input.razorpayOrderId,
    prefill: { ...input.prefill, method: "upi" },
    theme: { color: "#b91c1c" },
    config: {
      display: {
        preferences: { show_default_blocks: true },
      },
    },
    handler: input.onPaid,
    modal: { ondismiss: input.onCancel },
  };
}

/** Opens Razorpay for an existing unpaid order. Resolves true once the payment is verified, false if the customer closes it. */
export async function payExistingOrder(input: {
  orderId: string;
  number: string;
  shopName: string;
  name: string;
  phone: string;
  email: string;
}) {
  if (isNativeApp()) {
    await openNativePayment(input.orderId);
    return waitForNativePayment(input.orderId);
  }

  const payment = await api<{ keyId: string; razorpayOrderId: string; amount: number; currency: string; alreadyPaid?: boolean }>(
    "/api/payment/create",
    { method: "POST", body: { orderId: input.orderId } },
  );
  if (payment.alreadyPaid) return true;
  await loadRazorpay();
  if (!window.Razorpay) throw new ApiClientError("Payment could not be started. Please try again.");
  return new Promise<boolean>((resolve, reject) => {
    const checkout = new window.Razorpay!(
      razorpayCheckoutOptions({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: input.shopName,
        description: input.number,
        orderId: input.orderId,
        razorpayOrderId: payment.razorpayOrderId,
        prefill: { name: input.name, contact: input.phone, email: input.email },
        onPaid: (response) => {
          api("/api/payment/verify", { method: "POST", body: { orderId: input.orderId, ...response } }).then(() => resolve(true), reject);
        },
        onCancel: () => {
          void api("/api/payment/abandon", { method: "POST", body: { orderId: input.orderId } }).catch(() => undefined);
          resolve(false);
        },
      }),
    );
    checkout.open();
  });
}
