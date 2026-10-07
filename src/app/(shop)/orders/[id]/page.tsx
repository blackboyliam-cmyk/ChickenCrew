"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { BellRing, CalendarClock, Check, Clock, CreditCard, FileText, Loader2, MapPin, MessageCircle, RotateCcw, XCircle } from "lucide-react";
import { OrderTracking } from "@/components/site/order-tracking";
import { ErrorState, ListSkeleton } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { payExistingOrder } from "@/lib/razorpay-client";
import { waLink } from "@/lib/whatsapp";
import { formatOrderDate } from "@/lib/time";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  ["placed", "Order placed"],
  ["confirmed", "Confirmed"],
  ["preparing", "Preparing"],
  ["ready", "Packed"],
  ["out_for_delivery", "Out for delivery"],
  ["delivered", "Delivered"],
] as const;

function alertMessage(order: Order, shopName: string, origin: string) {
  const address = order.address;
  const payment =
    order.paymentStatus === "paid" ? "Paid online" : order.paymentMethod === "cod" ? "Cash on delivery" : "Online payment pending";
  return [
    `Hi ${shopName}, I just placed order #${order.number}.`,
    "",
    "Items:",
    ...order.items.map((item) => `- ${item.name} ${item.weight} × ${item.qty}`),
    "",
    `Total: ${formatINR(order.total)} (${payment})`,
    `Delivery: ${order.slot.date} · ${order.slot.label}`,
    `Name: ${address.name}`,
    `Phone: ${address.phone}`,
    `Address: ${[address.house, address.building, address.street, address.area, address.landmark, address.city].filter(Boolean).join(", ")} ${address.pincode}`,
    ...(origin ? ["", `Order: ${origin}/admin/orders?open=${order.id}`] : []),
    "",
    "Please confirm. Thank you!",
  ].join("\n");
}

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { refresh, settings, user } = useShop();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "cancel" | "reorder" | "pay">("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  async function load() {
    try {
      const data = await api<{ order: Order }>(`/api/orders/${params.id}`);
      setOrder(data.order);
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function cancel() {
    if (!window.confirm("Cancel this order?")) return;
    setBusy("cancel");
    try {
      const data = await api<{ order: Order }>(`/api/orders/${params.id}/cancel`, { method: "POST", body: {} });
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  async function pay() {
    if (!order) return;
    setBusy("pay");
    try {
      const paid = await payExistingOrder({
        orderId: order.id,
        number: order.number,
        shopName: settings.name,
        name: order.address.name,
        phone: order.address.phone,
        email: user?.email || "",
      });
      if (paid) await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Payment could not be started. Please try again.");
    } finally {
      setBusy("");
    }
  }

  async function reorder() {
    setBusy("reorder");
    try {
      const data = await api<{ notes: string[] }>(`/api/orders/${params.id}/reorder`, { method: "POST", body: {} });
      await refresh();
      setNote(data.notes.join(" ") || "Items were added to your cart.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  if (error && !order) {
    return (
      <div className="py-8">
        <ErrorState body="We couldn't load this order. Please try again." onRetry={() => void load()} />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  const current = STEPS.findIndex(([status]) => status === order.status);
  const placed = search.get("placed") === "1";
  const cancelled = order.status === "cancelled";
  const pending = order.status === "pending_payment";
  const showSuccess = placed && !cancelled && !pending;
  const canCancel = ["placed", "confirmed", "pending_payment"].includes(order.status);
  const address = order.address;
  const shopWhatsapp = settings.whatsapp || settings.phone;
  const alertHref =
    shopWhatsapp && !cancelled && order.status !== "delivered" ? waLink(shopWhatsapp, alertMessage(order, settings.name, origin)) : null;

  return (
    <div className="mx-auto max-w-3xl py-6 md:py-10">
      {showSuccess ? (
        <div className="flex flex-col items-center rounded-3xl border bg-card px-6 py-10 text-center">
          <span className="grid size-16 animate-pop place-items-center rounded-full bg-success text-white">
            <Check className="size-8" strokeWidth={3} aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">Order confirmed</h1>
          <p className="mt-1 text-sm text-muted-foreground">Order #{order.number}</p>
          <p className="mt-3 text-[15px]">Your order is being prepared.</p>
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-left">
            <CalendarClock className="size-5 text-primary" aria-hidden />
            <span className="leading-tight">
              <span className="block text-xs text-muted-foreground">Delivery</span>
              <span className="block text-sm font-bold">
                {order.slot.date} · {order.slot.label}
              </span>
            </span>
          </div>
          {alertHref && (
            <a
              href={alertHref}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-success text-sm font-bold tracking-wide text-white uppercase hover:bg-success/90"
            >
              <BellRing className="size-4" aria-hidden />
              Alert the shop
            </a>
          )}
          <div className={cn("grid w-full max-w-sm grid-cols-2 gap-2", alertHref ? "mt-2" : "mt-6")}>
            <a
              href="#tracking"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-bold tracking-wide text-primary-foreground uppercase hover:bg-primary-dark"
            >
              Track order
            </a>
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-xl border text-sm font-bold tracking-wide uppercase hover:bg-muted"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <Link href="/account/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← All orders
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[28px]">Order #{order.number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatOrderDate(order.createdAt)} · <span className="price">{formatINR(order.total)}</span>
          </p>
        </div>
      )}

      <section id="tracking" className="mt-6 scroll-mt-28 rounded-3xl border bg-card p-5 md:p-6" aria-labelledby="tracking-title">
        <h2 id="tracking-title" className="text-base font-bold">
          Order status
        </h2>
        {pending && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-warning" aria-hidden />
              {order.paymentStatus === "failed" ? "Your payment didn't go through." : "Waiting for payment confirmation."}
            </span>
            {order.paymentMethod === "razorpay" && (
              <button
                type="button"
                disabled={busy !== ""}
                onClick={() => void pay()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
              >
                {busy === "pay" ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                Pay {formatINR(order.total)}
              </button>
            )}
          </div>
        )}
        {cancelled ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="size-4" aria-hidden />
            {order.cancelReason || "This order was cancelled."}
          </p>
        ) : (
          <ol className="mt-5">
            {STEPS.map(([status, label], index) => {
              const done = current > index;
              const active = current === index;
              const last = index === STEPS.length - 1;
              return (
                <li key={status} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && (
                    <span className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-border" aria-hidden>
                      <span
                        className="block w-full bg-primary transition-[height] duration-500 ease-out"
                        style={{ height: done ? "100%" : "0%" }}
                      />
                    </span>
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300",
                      done && "border-primary bg-primary text-white",
                      active && "border-primary bg-card text-primary",
                      !done && !active && "border-border bg-card",
                    )}
                    aria-hidden
                  >
                    {done ? (
                      <Check className="size-3.5" strokeWidth={3.5} />
                    ) : active ? (
                      <span className="size-2.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                    ) : null}
                  </span>
                  <span className={cn("pt-0.5 text-sm", active ? "font-bold" : done ? "font-medium" : "text-muted-foreground")}>
                    {label}
                    {active && <span className="ml-2 text-xs font-medium text-primary">Now</span>}
                    <span className="sr-only">{done ? ", done" : active ? ", current step" : ", upcoming"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {order.status === "out_for_delivery" ? (
        <OrderTracking orderId={order.id} code={order.deliveryCode || null} />
      ) : (
        !cancelled &&
        !pending &&
        order.status !== "delivered" &&
        order.deliveryCode && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-bold">Delivery code</p>
              <p className="text-xs text-muted-foreground">You&apos;ll tell this to the rider at your door.</p>
            </div>
            <p className="font-mono text-2xl font-black tracking-[0.25em]">{order.deliveryCode}</p>
          </div>
        )
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="size-4 text-primary" aria-hidden />
            Delivery
          </h2>
          <p className="mt-2 text-sm font-semibold">
            {order.slot.date} · {order.slot.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {address.name}, {[address.house, address.building, address.street, address.area, address.city, address.state].filter(Boolean).join(", ")}{" "}
            {address.pincode}
          </p>
        </section>
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="size-4 text-primary" aria-hidden />
            Payment
          </h2>
          <p className="mt-2 text-sm font-semibold">
            {order.paymentStatus === "paid"
              ? order.paymentMethod === "cod"
                ? order.collection?.mode === "upi"
                  ? "Paid by UPI on delivery"
                  : "Paid in cash on delivery"
                : "Paid online"
              : order.paymentMethod === "cod"
                ? "Cash on delivery"
                : order.paymentStatus === "failed"
                  ? "Payment failed"
                  : order.paymentStatus === "refund_pending"
                    ? "Refund in progress"
                    : order.paymentStatus === "refunded"
                      ? "Refunded"
                      : "Awaiting payment"}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-3xl border bg-card p-5">
        <h2 className="text-sm font-bold">Items</h2>
        <ul className="mt-3 divide-y">
          {order.items.map((item) => (
            <li key={`${item.variantId}-${item.qty}`} className="flex items-center gap-3 py-3 text-sm first:pt-0">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.weight} × {item.qty}
                </span>
              </span>
              <span className="price font-semibold">{formatINR(item.unitPrice * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="price">{formatINR(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
              <dd className="price">−{formatINR(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery fee</dt>
            <dd className="price">{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <dt className="font-bold">Total</dt>
            <dd className="price text-xl font-extrabold">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {note && (
        <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success" role="status">
          {note}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => void reorder()}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-charcoal px-5 text-sm font-bold text-white hover:bg-charcoal/90 disabled:opacity-60"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reorder
        </button>
        {!pending && (
          <Link
            href={`/bill/${order.id}`}
            target="_blank"
            className="inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-sm font-semibold hover:bg-muted"
          >
            <FileText className="size-4" aria-hidden />
            Bill
          </Link>
        )}
        {alertHref && !showSuccess && (
          <a
            href={alertHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-success px-5 text-sm font-bold text-white hover:bg-success/90"
          >
            <BellRing className="size-4" aria-hidden />
            Alert the shop
          </a>
        )}
        {settings.whatsapp && (
          <a
            href={waLink(settings.whatsapp, `Hi ${settings.name}, I need help with order #${order.number}.`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-sm font-semibold hover:bg-muted"
          >
            <MessageCircle className="size-4 text-success" aria-hidden />
            WhatsApp us
          </a>
        )}
        {!showSuccess && (
          <Link href="/shop" className="inline-flex h-12 items-center rounded-xl border px-5 text-sm font-semibold hover:bg-muted">
            Continue shopping
          </Link>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => void cancel()}
            className="inline-flex h-12 items-center rounded-xl px-5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
