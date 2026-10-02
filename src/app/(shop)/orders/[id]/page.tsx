"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CalendarClock, Check, Clock, CreditCard, MapPin, RotateCcw, XCircle } from "lucide-react";
import { ErrorState, ListSkeleton } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
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

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { refresh } = useShop();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "cancel" | "reorder">("");

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
          <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-2">
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
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm">
            <Clock className="size-4 text-warning" aria-hidden />
            Waiting for payment confirmation.
          </p>
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
              ? "Paid online"
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
