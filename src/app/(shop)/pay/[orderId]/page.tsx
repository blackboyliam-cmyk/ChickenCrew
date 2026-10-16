"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { loadRazorpay } from "@/lib/razorpay-client";
import type { Order } from "@/lib/types";

/**
 * Standalone payment page opened in Chrome Custom Tabs from the Android app.
 * Razorpay shows UPI here the same way as on the website (not inside the WebView).
 */
export default function PayOrderPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { settings, user, ready } = useShop();
  const [message, setMessage] = useState("Opening secure payment…");
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const data = await api<{ order: Order }>(`/api/orders/${params.orderId}`);
        const order = data.order;
        if (order.paymentStatus === "paid") {
          router.replace(`/orders/${order.id}?placed=1`);
          return;
        }
        if (order.paymentMethod !== "razorpay") {
          router.replace(`/orders/${order.id}`);
          return;
        }

        setMessage("Waiting for confirmation…");
        const payment = await api<{ keyId: string; razorpayOrderId: string; amount: number; currency: string; alreadyPaid?: boolean }>(
          "/api/payment/create",
          { method: "POST", body: { orderId: order.id } },
        );
        if (payment.alreadyPaid) {
          router.replace(`/orders/${order.id}?placed=1`);
          return;
        }

        await loadRazorpay();
        if (!window.Razorpay) throw new ApiClientError("Payment could not be started.");

        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: settings.name,
          description: order.number,
          order_id: payment.razorpayOrderId,
          prefill: {
            name: order.address.name,
            contact: order.address.phone,
            email: user?.email || "",
            method: "upi",
          },
          theme: { color: "#b91c1c" },
          config: {
            display: {
              preferences: { show_default_blocks: true },
            },
          },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            setMessage("Confirming payment…");
            try {
              await api("/api/payment/verify", { method: "POST", body: { orderId: order.id, ...response } });
              router.replace(`/orders/${order.id}?placed=1`);
            } catch {
              router.replace(`/orders/${order.id}?failed=1`);
            }
          },
          modal: {
            ondismiss: () => {
              void api("/api/payment/abandon", { method: "POST", body: { orderId: order.id } }).catch(() => undefined);
              router.replace(`/orders/${order.id}?failed=1`);
            },
          },
        });
        checkout.open();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Payment could not be started.");
        window.setTimeout(() => router.replace(`/orders/${params.orderId}?failed=1`), 1600);
      }
    })();
  }, [ready, params.orderId, router, settings.name, user?.email]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <h1 className="mt-5 text-xl font-extrabold tracking-tight">Waiting for confirmation</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
