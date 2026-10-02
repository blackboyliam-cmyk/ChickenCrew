"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bike, ChevronDown, ClipboardList, FileText, MapPin, MessageCircle, Phone, Printer, RefreshCw } from "lucide-react";
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
import { NEW_ORDERS_EVENT } from "@/components/admin/order-alerts";
import { OPEN_STATUSES, ORDER_FLOW, PAYMENT, STATUS, orderTime } from "@/components/admin/order-status";
import { placeUrl } from "@/lib/maps";
import { formatINR } from "@/lib/money";
import type { Address, Collection, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

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
  riderId: string | null;
  deliveryCode: string | null;
  collection: Collection | null;
};

type RiderOption = { id: string; name: string; phone: string; active: boolean };

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

function customerMessage(order: Row, origin: string) {
  const first = order.address.name.split(" ")[0];
  const track = `${origin}/orders/${order.id}`;
  switch (order.status) {
    case "placed":
    case "confirmed":
      return `Hi ${first}, your ChickenCrew order #${order.number} is confirmed for ${order.slot.label}. Track it here: ${track}`;
    case "preparing":
    case "ready":
      return `Hi ${first}, we're packing your ChickenCrew order #${order.number} now. Track it here: ${track}`;
    case "out_for_delivery":
      return `Hi ${first}, your ChickenCrew order #${order.number} is on the way! Track the rider live: ${track}${
        order.deliveryCode ? `\nPlease share code ${order.deliveryCode} with the rider at your door.` : ""
      }`;
    case "delivered":
      return `Hi ${first}, thanks for ordering from ChickenCrew! Your bill for order #${order.number}: ${origin}/bill/${order.id}`;
    default:
      return `Hi ${first}, this is ChickenCrew about your order #${order.number}.`;
  }
}

function collectionText(collection: Collection, riders: RiderOption[]) {
  const who = collection.riderId ? riders.find((rider) => rider.id === collection.riderId)?.name || "the rider" : "the shop";
  if (collection.mode === "upi") return `${formatINR(collection.amount)} paid by UPI`;
  return `${formatINR(collection.amount)} cash collected by ${who}${collection.settledAt ? "" : " · not handed over yet"}`;
}

function OrdersView() {
  const params = useSearchParams();
  const { data, reload, error } = useAdmin<{ orders: Row[] }>("/api/admin/orders");
  const { data: riderData } = useAdmin<{ riders: RiderOption[] }>("/api/admin/riders");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [busy, setBusy] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const riders = useMemo(() => riderData?.riders ?? [], [riderData]);
  const openParam = params.get("open");

  useEffect(() => {
    setOrigin(window.location.origin);
    const refresh = () => void reload();
    window.addEventListener(NEW_ORDERS_EVENT, refresh);
    return () => window.removeEventListener(NEW_ORDERS_EVENT, refresh);
  }, [reload]);

  useEffect(() => {
    if (openParam) setOpenId(openParam);
  }, [openParam]);

  useEffect(() => {
    if (!openParam || !data) return;
    const order = data.orders.find((item) => item.id === openParam);
    if (order && !TABS.find((t) => t.id === tab)!.match(order.status)) setTab("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, openParam]);

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

  async function assign(order: Row, riderId: string | null) {
    setBusy(order.id);
    const name = riders.find((rider) => rider.id === riderId)?.name;
    await attempt(
      () => saveAdmin(`/api/admin/orders/${order.id}`, { riderId }, "PUT"),
      riderId ? `#${order.number} assigned to ${name}` : `Rider removed from #${order.number}`,
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
              const closed = order.status === "delivered" || order.status === "cancelled";
              const rider = order.riderId ? riders.find((item) => item.id === order.riderId) : null;
              const pin = order.address.lat != null && order.address.lng != null ? { lat: order.address.lat, lng: order.address.lng } : null;
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
                          {order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? "Cash on delivery" : PAYMENT[order.paymentStatus].label}
                        </Badge>
                        {rider && (
                          <Badge tone="blue">
                            <Bike className="size-3" /> {rider.name.split(" ")[0]}
                          </Badge>
                        )}
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
                        {order.collection && (
                          <p className="mt-3 rounded-xl border bg-white px-3.5 py-2.5 text-sm">{collectionText(order.collection, riders)}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm" className="rounded-lg">
                            <Link href={`/bill/${order.id}?print=1`} target="_blank">
                              <FileText className="size-3.5" /> Print bill
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="rounded-lg">
                            <Link href={`/bill/${order.id}?size=80mm&print=1`} target="_blank">
                              <Printer className="size-3.5" /> Receipt
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliver to</p>
                          <div className="mt-2 rounded-xl border bg-white p-3.5 text-sm">
                            <p className="font-semibold">{order.address.name}</p>
                            <p className="mt-1 flex gap-1.5 text-muted-foreground">
                              <MapPin className="mt-0.5 size-3.5 shrink-0" /> {address}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                              <a href={`tel:${order.address.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-primary">
                                <Phone className="size-3.5" /> {order.address.phone}
                              </a>
                              <a
                                href={waLink(order.address.phone, customerMessage(order, origin))}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"
                              >
                                <MessageCircle className="size-3.5" /> WhatsApp
                              </a>
                              {pin && (
                                <a href={placeUrl(pin)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                                  <MapPin className="size-3.5" /> Map pin
                                </a>
                              )}
                            </div>
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
                            {!closed && (
                              <div>
                                <label htmlFor={`rider-${order.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Rider
                                </label>
                                <select
                                  id={`rider-${order.id}`}
                                  value={order.riderId || ""}
                                  disabled={busy === order.id}
                                  onChange={(event) => void assign(order, event.target.value || null)}
                                  className="mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm"
                                >
                                  <option value="">Not assigned</option>
                                  {riders
                                    .filter((item) => item.active || item.id === order.riderId)
                                    .map((item) => (
                                      <option key={item.id} value={item.id} disabled={!item.active}>
                                        {item.name}
                                        {item.active ? "" : " (off)"}
                                      </option>
                                    ))}
                                </select>
                                {riderData && riders.length === 0 && (
                                  <p className="mt-1.5 text-xs text-muted-foreground">
                                    Add delivery partners on the{" "}
                                    <Link href="/admin/riders" className="font-semibold text-primary">
                                      Riders
                                    </Link>{" "}
                                    page.
                                  </p>
                                )}
                              </div>
                            )}
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
