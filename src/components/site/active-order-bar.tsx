"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/components/site/shop-context";
import { api } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActiveOrder = { id: string; number: string; status: OrderStatus; slot: { date: string; label: string } };

const POLL_MS = 20000;

const STEPS: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

const COPY: Record<OrderStatus, { title: string; body: string }> = {
  pending_payment: { title: "Payment pending", body: "Finish paying to confirm your order." },
  placed: { title: "Order placed", body: "Waiting for the shop to confirm." },
  confirmed: { title: "Order confirmed", body: "The shop has your order." },
  preparing: { title: "Being prepared", body: "Your cuts are being cleaned and packed." },
  ready: { title: "Packed", body: "Waiting for the rider to pick it up." },
  out_for_delivery: { title: "On the way", body: "Your rider is heading to you." },
  delivered: { title: "Delivered", body: "Enjoy your meal." },
  cancelled: { title: "Cancelled", body: "This order was cancelled." },
};

/** Shows the customer's latest open order under the header and announces each status change. */
export function ActiveOrderBar() {
  const { user } = useShop();
  const pathname = usePathname();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const seen = useRef<Map<string, OrderStatus> | null>(null);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      seen.current = null;
      return;
    }
    let stopped = false;

    async function finished(id: string) {
      try {
        const { order } = await api<{ order: ActiveOrder }>(`/api/orders/${id}`);
        if (!stopped && (order.status === "delivered" || order.status === "cancelled")) {
          toast(`Order #${order.number}: ${COPY[order.status].title}`, { description: COPY[order.status].body });
        }
      } catch {
        /* ignore */
      }
    }

    async function tick() {
      try {
        const data = await api<{ orders: ActiveOrder[] }>("/api/orders?filter=active");
        if (stopped) return;
        const previous = seen.current;
        if (previous) {
          for (const order of data.orders) {
            const before = previous.get(order.id);
            if (before && before !== order.status) {
              toast(`Order #${order.number}: ${COPY[order.status].title}`, { description: COPY[order.status].body });
            }
          }
          for (const id of previous.keys()) {
            if (!data.orders.some((order) => order.id === id)) void finished(id);
          }
        }
        seen.current = new Map(data.orders.map((order) => [order.id, order.status]));
        setOrders(data.orders);
      } catch {
        /* keep the last known state */
      }
    }

    void tick();
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, pathname]);

  const order = orders[0];
  if (!order || pathname.startsWith("/orders/") || pathname === "/checkout") return null;

  const copy = COPY[order.status];
  const step = STEPS.indexOf(order.status);
  const more = orders.length - 1;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block border-t border-primary/15 bg-primary/[0.06] transition-colors hover:bg-primary/10"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2 md:px-6">
        <span className="relative flex size-2.5 shrink-0" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="font-bold">{copy.title}</span>
            <span className="text-muted-foreground"> · Order #{order.number}</span>
            <span className="hidden text-muted-foreground sm:inline"> · {copy.body}</span>
          </p>
          {step >= 0 && (
            <div className="mt-1.5 flex max-w-xs gap-1" aria-hidden>
              {STEPS.slice(0, -1).map((name, index) => (
                <span key={name} className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-primary/15")} />
              ))}
            </div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
          {more > 0 ? `+${more} more` : "Track"}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
