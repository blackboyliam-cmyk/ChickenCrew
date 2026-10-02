"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, Loader2, RotateCcw } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { formatOrderDate } from "@/lib/time";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "active", "delivered", "cancelled"] as const;

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "bg-warning/15 text-warning" },
  placed: { label: "Placed", tone: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmed", tone: "bg-primary/10 text-primary" },
  preparing: { label: "Preparing", tone: "bg-primary/10 text-primary" },
  ready: { label: "Packed", tone: "bg-primary/10 text-primary" },
  out_for_delivery: { label: "Out for delivery", tone: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", tone: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground" },
};

export default function OrdersPage() {
  const { user, ready, refresh } = useShop();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [reordering, setReordering] = useState("");

  function load() {
    setOrders(null);
    setError("");
    api<{ orders: Order[] }>(`/api/orders?filter=${filter}`)
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong."));
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  async function reorder(id: string) {
    setReordering(id);
    try {
      const data = await api<{ notes: string[] }>(`/api/orders/${id}/reorder`, { method: "POST", body: {} });
      await refresh();
      setNotes(data.notes.join(" ") || "Items were added to your cart.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setReordering("");
    }
  }

  if (!ready) return <ListSkeleton rows={3} />;
  if (!user) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sign in to see your orders"
        body="Your past and current orders appear here."
        actionLabel="Sign in"
        href="/login?next=/account/orders"
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold">Orders</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Filter orders">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={cn(
              "h-10 shrink-0 rounded-lg border px-4 text-sm font-medium capitalize transition-colors",
              filter === item ? "border-charcoal bg-charcoal text-white" : "bg-card hover:border-foreground/30",
            )}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {notes && (
        <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success" role="status">
          {notes}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      )}

      <div className="mt-4">
        {error ? (
          <ErrorState onRetry={load} />
        ) : orders === null ? (
          <ListSkeleton rows={3} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders yet."
            body={filter === "all" ? "When you place an order, it'll show up here." : `No ${filter} orders.`}
            actionLabel="Start shopping"
            href="/shop"
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const status = STATUS[order.status];
              const count = order.items.reduce((sum, item) => sum + item.qty, 0);
              return (
                <li key={order.id} className="relative rounded-2xl border bg-card p-4 transition-shadow hover:shadow-raised">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold">
                        <Link href={`/orders/${order.id}`} className="after:absolute after:inset-0 after:content-['']">
                          Order #{order.number}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-semibold", status.tone)}>{status.label}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 4).map((item) => (
                        <span key={item.variantId} className="relative size-10 overflow-hidden rounded-lg border-2 border-card bg-muted">
                          {item.image && <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />}
                        </span>
                      ))}
                    </div>
                    <p className="min-w-0 truncate text-sm text-muted-foreground">
                      {count} {count === 1 ? "item" : "items"} · {order.slot.date}, {order.slot.label}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <p className="price text-base font-extrabold">{formatINR(order.total)}</p>
                    <button
                      type="button"
                      disabled={reordering !== ""}
                      onClick={() => void reorder(order.id)}
                      className="relative z-10 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      {reordering === order.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <RotateCcw className="size-4" aria-hidden />
                      )}
                      Reorder
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
