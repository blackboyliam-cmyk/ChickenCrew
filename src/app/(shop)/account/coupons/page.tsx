"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/site/states";
import { api } from "@/lib/api-client";

type Coupon = { code: string; description: string };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState("");

  function load() {
    setError(false);
    api<{ coupons: Coupon[] }>("/api/coupons")
      .then((data) => setCoupons(data.coupons))
      .catch(() => setError(true));
  }

  useEffect(load, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`${code} copied. Paste it at checkout.`);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.message(`Use code ${code} at checkout.`);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold">Coupons</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Apply a code at checkout to save on your order.</p>
      <div className="mt-4">
        {error ? (
          <ErrorState onRetry={load} />
        ) : !coupons ? (
          <ListSkeleton rows={2} />
        ) : coupons.length === 0 ? (
          <EmptyState icon={TicketPercent} title="No coupons right now" body="New offers show up here as soon as the shop publishes them." actionLabel="See today's deals" href="/offers" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {coupons.map((coupon) => (
              <li key={coupon.code} className="relative flex overflow-hidden rounded-2xl border bg-card shadow-card">
                <div className="grid w-16 shrink-0 place-items-center bg-primary text-primary-foreground">
                  <TicketPercent className="size-6" />
                </div>
                <span aria-hidden className="absolute -top-2.5 left-[54px] size-5 rounded-full border bg-background" />
                <span aria-hidden className="absolute -bottom-2.5 left-[54px] size-5 rounded-full border bg-background" />
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <p className="text-sm leading-snug text-foreground/80">{coupon.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-primary">
                      {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copy(coupon.code)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/[0.06]"
                    >
                      {copied === coupon.code ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied === coupon.code ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {coupons && coupons.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Ready to use one?{" "}
          <Link href="/cart" className="font-semibold text-primary hover:underline">
            Go to your cart
          </Link>
        </p>
      )}
    </div>
  );
}
