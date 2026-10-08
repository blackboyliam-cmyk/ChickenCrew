"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, ClipboardList, IndianRupee, PackageX, Users } from "lucide-react";
import { AdminHeader, Badge, ErrorBanner, Panel, errorText } from "@/components/admin/forms";
import { OPEN_STATUSES, STATUS, kolkataDay, orderTime } from "@/components/admin/order-status";
import { PhoneAlerts } from "@/components/admin/phone-alerts";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import type { OrderStatus, Product, ShopSettings, SlotTemplate } from "@/lib/types";

type OrderRow = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: { name: string; weight: string; qty: number }[];
  address: { name: string };
};

type Data = {
  orders: OrderRow[];
  products: Product[];
  customers: number;
  settings: ShopSettings;
  slots: SlotTemplate[];
};

const LOW_STOCK = 5;

export default function AdminHome() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [orders, products, customers, settings, slots] = await Promise.all([
        api<{ orders: OrderRow[] }>("/api/admin/orders"),
        api<{ products: Product[] }>("/api/admin/products"),
        api<{ customers: unknown[] }>("/api/admin/customers"),
        api<{ settings: ShopSettings }>("/api/admin/settings"),
        api<{ slots: SlotTemplate[] }>("/api/admin/slots"),
      ]);
      setData({
        orders: orders.orders,
        products: products.products,
        customers: customers.customers.length,
        settings: settings.settings,
        slots: slots.slots,
      });
      setError("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const today = kolkataDay(new Date());
  const real = data?.orders.filter((order) => order.status !== "pending_payment") ?? [];
  const todays = real.filter((order) => kolkataDay(order.createdAt) === today);
  const sales = todays.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
  const open = real.filter((order) => OPEN_STATUSES.includes(order.status));
  const low =
    data?.products.flatMap((product) =>
      product.active
        ? product.variants.filter((variant) => variant.active && variant.stock <= LOW_STOCK).map((variant) => ({ product, variant }))
        : [],
    ) ?? [];

  const settings = data?.settings;
  const checklist = settings
    ? [
        { done: Boolean(settings.phone), label: "Add the shop phone number", href: "/admin/settings" },
        { done: Boolean(settings.addressLine && settings.city), label: "Add the shop address", href: "/admin/settings" },
        { done: settings.servicePincodes.length > 0, label: "List the pincodes you deliver to", href: "/admin/settings" },
        { done: Boolean(data?.slots.some((slot) => slot.active)), label: "Open at least one delivery slot", href: "/admin/slots" },
        { done: settings.codEnabled || settings.onlinePaymentEnabled, label: "Turn on a payment method", href: "/admin/settings" },      ]
    : [];
  const pending = checklist.filter((item) => !item.done).length;

  const stats = [
    { label: "Orders today", value: data ? String(todays.length) : "—", icon: ClipboardList },
    { label: "Sales today", value: data ? formatINR(sales) : "—", icon: IndianRupee },
    { label: "Need action", value: data ? String(open.length) : "—", icon: AlertTriangle, highlight: open.length > 0 },
    { label: "Customers", value: data ? String(data.customers) : "—", icon: Users },
  ];

  return (
    <div>
      <AdminHeader title="Overview" description="Today at a glance. Figures update when you reload this page." />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, highlight }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-card md:p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
              <span className={`grid size-8 place-items-center rounded-lg ${highlight ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight md:text-[28px]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              All orders <ArrowRight className="size-4" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {!data ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : real.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders yet. New orders will show up here.</p>
          ) : (
            <ul className="divide-y">
              {real.slice(0, 6).map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders?open=${order.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        #{order.number}
                        <Badge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Badge>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.address.name} · {order.items.map((item) => `${item.name} ${item.weight} ×${item.qty}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatINR(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{orderTime(order.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <PhoneAlerts />

          {settings && pending > 0 && (
            <Panel title="Before you go live" description={`${checklist.length - pending} of ${checklist.length} done`}>
              <ul className="space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="flex items-center gap-2.5 text-sm hover:text-primary">
                      {item.done ? (
                        <CheckCircle2 className="size-4.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="size-4.5 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Low stock"
            description={`Weights with ${LOW_STOCK} or fewer packs left`}
            action={
              <Link href="/admin/products" className="text-sm font-semibold text-primary hover:underline">
                Products
              </Link>
            }
            bodyClassName="p-0"
          >
            {!data ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : low.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" /> Everything is well stocked.
              </p>
            ) : (
              <ul className="divide-y">
                {low.slice(0, 8).map(({ product, variant }) => (
                  <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate">
                      {product.name} <span className="text-muted-foreground">· {variant.label}</span>
                    </span>
                    <Badge tone={variant.stock === 0 ? "red" : "amber"}>
                      {variant.stock === 0 ? (
                        <>
                          <PackageX className="size-3" /> Sold out
                        </>
                      ) : (
                        `${variant.stock} left`
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
