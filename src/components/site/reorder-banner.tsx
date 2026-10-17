"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

type PastOrder = {
  id: string;
  number: string;
  total: number;
  status: string;
  deliveredAt: string | null;
  items: { name: string; weight: string; qty: number }[];
};

export function ReorderBanner() {
  const { user, ready, refresh } = useShop();
  const router = useRouter();
  const [order, setOrder] = useState<PastOrder | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    api<{ orders: PastOrder[] }>("/api/orders?filter=delivered")
      .then((data) => {
        if (cancelled) return;
        const recent = data.orders.find((item) => item.status === "delivered") || null;
        setOrder(recent);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!order) return null;

  const summary = order.items
    .slice(0, 3)
    .map((item) => `${item.name} ${item.weight}`)
    .join(", ");

  async function reorder() {
    setBusy(true);
    try {
      const data = await api<{ notes: string[] }>(`/api/orders/${order!.id}/reorder`, { method: "POST", body: {} });
      await refresh();
      toast.success(data.notes.join(" ") || "Items added to your cart.", {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not reorder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5" aria-label="Order again">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Order again this week</p>
          <p className="mt-1 text-sm font-bold">#{order.number} · {formatINR(order.total)}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex h-10 items-center rounded-xl border px-3 text-sm font-semibold hover:bg-muted"
          >
            Details
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reorder()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-charcoal px-3 text-sm font-bold text-white hover:bg-charcoal/90 disabled:opacity-60"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {busy ? "Adding…" : "Reorder"}
          </button>
        </div>
      </div>
    </section>
  );
}
