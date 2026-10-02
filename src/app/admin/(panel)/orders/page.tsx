"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ClipboardList, MapPin, Phone, RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  AdminHeader,
  Badge,
  EmptyRow,
  ErrorBanner,
  LoadingRows,
  Panel,
  SearchInput,
  attempt,
  saveAdmin,
  useAdmin,
} from "@/components/admin/forms";
import { OPEN_STATUSES, ORDER_FLOW, PAYMENT, STATUS, orderTime } from "@/components/admin/order-status";
import { formatINR } from "@/lib/money";
import type { Address, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

type Row = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  cancelReason: string;
  items: OrderItem[];
  address: Omit<Address, "id" | "userId">;
  slot: { date: string; label: string };
};

const TABS = [
  { id: "open", label: "Needs action", match: (s: OrderStatus) => OPEN_STATUSES.includes(s) },
  { id: "delivered", label: "Delivered", match: (s: OrderStatus) => s === "delivered" },
  { id: "cancelled", label: "Cancelled", match: (s: OrderStatus) => s === "cancelled" },
  { id: "all", label: "All", match: (s: OrderStatus) => s !== "pending_payment" },
] as const;

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "Confirm order",
  confirmed: "Start preparing",
  preparing: "Mark packed",
  ready: "Out for delivery",
  out_for_delivery: "Mark delivered",
};

function OrdersView() {
  const params = useSearchParams();
  const { data, reload, error } = useAdmin<{ orders: Row[] }>("/api/admin/orders");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("open");
    if (!id || !data) return;
    const order = data.orders.find((item) => item.id === id);
    if (order && !TABS.find((t) => t.id === tab)!.match(order.status)) setTab("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, data?.orders.filter((o) => t.match(o.status)).length ?? 0])),
    [data],
  );

  const rows = useMemo(() => {
    const active = TABS.find((t) => t.id === tab)!;
    const q = query.trim().toLowerCase();
    return (data?.orders ?? []).filter(
      (order) =>
        active.match(order.status) &&
        (!q ||
          order.number.toLowerCase().includes(q) ||
          order.address.name.toLowerCase().includes(q) ||
          order.address.phone.includes(q)),
    );
  }, [data, tab, query]);

  async function setStatus(order: Row, status: OrderStatus) {
    if (status === order.status) return;
    if (status === "cancelled" && !window.confirm(`Cancel order #${order.number}? Stock goes back on the shelf.`)) return;
    setBusy(order.id);
    await attempt(
      () => saveAdmin(`/api/admin/orders/${order.id}`, { status }, "PUT"),
      `#${order.number} is now ${STATUS[status].label.toLowerCase()}`,
    );
    await reload();
    setBusy(null);
  }

  return (
    <div>
      <AdminHeader
        title="Orders"
        description="Move each order along as you prepare and deliver it. Customers see the status on their order page."
        action={
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => void reload()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                tab === t.id ? "bg-charcoal text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px]", tab === t.id ? "bg-white/20" : "bg-muted")}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search number, name or phone" />
      </div>

      <Panel bodyClassName="p-0">
        {!data ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyRow
            icon={ClipboardList}
            title={query ? "No matching orders" : tab === "open" ? "You're all caught up" : "No orders here yet"}
            body={tab === "open" && !query ? "New orders appear here as soon as customers place them." : undefined}
          />
        ) : (
          <ul className="divide-y">
            {rows.map((order) => {
              const expanded = openId === order.id;
              const next = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1];
              const address = [order.address.house, order.address.building, order.address.street, order.address.area, order.address.landmark, order.address.city, order.address.pincode]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : order.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold">#{order.number}</span>
                        <Badge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Badge>
                        <Badge tone={PAYMENT[order.paymentStatus].tone}>
                          {order.paymentMethod === "cod" ? "Cash on delivery" : PAYMENT[order.paymentStatus].label}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-muted-foreground">
                        {order.address.name} · {order.slot.label} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-bold">{formatINR(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{orderTime(order.createdAt)}</p>
                    </div>
                    <ChevronDown className={cn("size-4.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                  </button>

                  {expanded && (
                    <div className="grid gap-5 border-t bg-muted/25 px-5 py-5 md:grid-cols-[1.3fr_1fr]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                        <ul className="mt-2 divide-y rounded-xl border bg-white">
                          {order.items.map((item) => (
                            <li key={item.variantId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                              <span>
                                <span className="font-semibold">{item.qty} ×</span> {item.name}{" "}
                                <span className="text-muted-foreground">{item.weight}</span>
                              </span>
                              <span className="font-medium">{formatINR(item.unitPrice * item.qty)}</span>
                            </li>
                          ))}
                        </ul>
                        <dl className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <dt>Item total</dt>
                            <dd>{formatINR(order.subtotal)}</dd>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <dt>Coupon {order.couponCode}</dt>
                              <dd>−{formatINR(order.discount)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground">
                            <dt>Delivery</dt>
                            <dd>{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</dd>
                          </div>
                          <div className="flex justify-between border-t pt-1.5 font-bold">
                            <dt>{order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? "Collect on delivery" : "Total"}</dt>
                            <dd>{formatINR(order.total)}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver to</p>
                          <div className="mt-2 rounded-xl border bg-white p-3.5 text-sm">
                            <p className="font-semibold">{order.address.name}</p>
                            <p className="mt-1 flex gap-1.5 text-muted-foreground">
                              <MapPin className="mt-0.5 size-3.5 shrink-0" /> {address}
                            </p>
                            <a href={`tel:${order.address.phone}`} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary">
                              <Phone className="size-3.5" /> {order.address.phone}
                            </a>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Slot: <span className="font-medium text-foreground">{order.slot.label}</span> · Ordered {orderTime(order.createdAt)}
                            </p>
                          </div>
                        </div>

                        {order.status === "cancelled" ? (
                          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                            {order.cancelReason || "This order was cancelled."}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {next && NEXT_LABEL[order.status] && (
                              <Button
                                className="h-11 w-full rounded-xl font-bold"
                                disabled={busy === order.id}
                                onClick={() => void setStatus(order, next)}
                              >
                                {NEXT_LABEL[order.status]}
                              </Button>
                            )}
                            <div className="flex gap-2">
                              <select
                                aria-label="Set status"
                                value={order.status}
                                disabled={busy === order.id}
                                onChange={(event) => void setStatus(order, event.target.value as OrderStatus)}
                                className="h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm"
                              >
                                {[...ORDER_FLOW, "cancelled" as const].map((status) => (
                                  <option key={status} value={status}>
                                    {STATUS[status].label}
                                  </option>
                                ))}
                              </select>
                              {order.status !== "delivered" && (
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-xl text-destructive hover:text-destructive"
                                  disabled={busy === order.id}
                                  onClick={() => void setStatus(order, "cancelled")}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export default function OrdersAdmin() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
