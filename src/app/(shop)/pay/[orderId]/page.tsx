"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { loadRazorpay } from "@/lib/razorpay-client";

type PaySession = {
  alreadyPaid?: boolean;
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  shopName: string;
  order: {
    id: string;
    number: string;
    paymentStatus: string;
    paymentMethod: string;
    address: { name: string; phone: string };
  };
};

function PayShell({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <h1 className="mt-5 text-xl font-extrabold tracking-tight">Waiting for confirmation</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Standalone payment page opened in Chrome Custom Tabs from the Android app.
 * Auth uses ?t= payment token because Custom Tabs do not share the WebView session cookie.
 */
function PayOrderInner() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const paymentToken = search.get("t") || "";
  const [message, setMessage] = useState("Opening secure payment…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        if (!paymentToken) {
          throw new ApiClientError("This payment link has expired. Go back to the app and try again.");
        }

        const session = await api<PaySession>("/api/payment/session", {
          method: "POST",
          body: { orderId: params.orderId, paymentToken },
        });

        if (session.alreadyPaid) {
          router.replace(`/orders/${session.order.id}?placed=1`);
          return;
        }

        setMessage("Waiting for confirmation…");
        await loadRazorpay();
        if (!window.Razorpay) throw new ApiClientError("Payment could not be started.");

        const checkout = new window.Razorpay({
          key: session.keyId,
          amount: session.amount,
          currency: session.currency,
          name: session.shopName,
          description: session.order.number,
          order_id: session.razorpayOrderId,
          prefill: {
            name: session.order.address.name,
            contact: session.order.address.phone,
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
              await api("/api/payment/verify", {
                method: "POST",
                body: { orderId: session.order.id, paymentToken, ...response },
              });
              router.replace(`/orders/${session.order.id}?placed=1`);
            } catch {
              router.replace(`/orders/${session.order.id}?failed=1`);
            }
          },
          modal: {
            ondismiss: () => {
              void api("/api/payment/abandon", {
                method: "POST",
                body: { orderId: session.order.id, paymentToken },
              }).catch(() => undefined);
              router.replace(`/orders/${session.order.id}?failed=1`);
            },
          },
        });
        checkout.open();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Payment could not be started.");
        window.setTimeout(() => router.replace(`/orders/${params.orderId}?failed=1`), 1800);
      }
    })();
  }, [params.orderId, paymentToken, router]);

  return <PayShell message={message} />;
}

export default function PayOrderPage() {
  return (
    <Suspense fallback={<PayShell message="Opening secure payment…" />}>
      <PayOrderInner />
    </Suspense>
  );
}
