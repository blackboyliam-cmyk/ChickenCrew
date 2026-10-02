"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChefHat, ShoppingBag, Trash2, Truck } from "lucide-react";
import { openMealAssistant } from "@/components/site/meal-assistant";
import { EmptyState, ListSkeleton, SectionHeader } from "@/components/site/states";
import { ProductRail } from "@/components/site/product-card";
import { QuantitySelector } from "@/components/site/quantity-selector";
import { useShop } from "@/components/site/shop-context";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { computeDeliveryFee } from "@/lib/pricing";
import type { ProductCardData } from "@/lib/types";

export default function CartPage() {
  const { cart, ready, setQty, settings } = useShop();
  const [suggestions, setSuggestions] = useState<ProductCardData[]>([]);

  useEffect(() => {
    api<{ items: ProductCardData[] }>("/api/products?pageSize=12&available=1")
      .then((data) => setSuggestions(data.items))
      .catch(() => setSuggestions([]));
  }, []);

  const inCart = new Set(cart?.items.map((item) => item.productId));
  const more = suggestions.filter((item) => !inCart.has(item.id)).slice(0, 4);

  if (!ready && !cart) {
    return (
      <div className="py-6">
        <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Your cart</h1>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="space-y-10 py-6">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is waiting."
          body="Add a few fresh cuts and they'll show up here."
          actionLabel="Start shopping"
          href="/shop"
        />
        {more.length > 0 && (
          <section>
            <SectionHeader title="Popular right now" href="/shop" />
            <ProductRail products={more} />
          </section>
        )}
      </div>
    );
  }

  const delivery = computeDeliveryFee(cart.subtotal, settings);
  const total = cart.subtotal + delivery;
  const savings = cart.items.reduce((sum, item) => sum + Math.max(0, item.mrp - item.unitPrice) * item.qty, 0);
  const threshold = settings.deliveryFee > 0 ? settings.freeDeliveryAbove : null;
  const remaining = threshold != null ? Math.max(0, threshold - cart.subtotal) : 0;
  const progress = threshold ? Math.min(100, Math.round((cart.subtotal / threshold) * 100)) : 0;
  const blocked = cart.items.some((item) => !item.inStock);

  return (
    <div className="py-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[32px]">Your cart</h1>
        <p className="text-sm text-muted-foreground">
          {cart.count} {cart.count === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div className="space-y-4">
          {threshold != null && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Truck className="size-4 text-primary" aria-hidden />
                {remaining > 0 ? (
                  <>
                    Add <span className="price font-bold">{formatINR(remaining)}</span> more for free delivery
                  </>
                ) : (
                  <span className="font-semibold text-success">You&apos;ve unlocked free delivery</span>
                )}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Progress to free delivery"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${remaining > 0 ? "bg-primary" : "bg-success"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="price mt-1.5 text-right text-xs text-muted-foreground">
                {formatINR(cart.subtotal)} / {formatINR(threshold)}
              </p>
            </div>
          )}

          <ul className="divide-y rounded-2xl border bg-card">
            {cart.items.map((item) => (
              <li key={item.id} className="flex animate-fade-up gap-3 p-3 sm:gap-4 sm:p-4">
                <Link
                  href={`/product/${item.slug}`}
                  className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24"
                >
                  {item.image && <Image src={item.image} alt={item.imageAlt} fill className="object-cover" sizes="96px" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/product/${item.slug}`} className="line-clamp-2 text-[15px] leading-snug font-semibold hover:text-primary">
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.weight} · {formatINR(item.unitPrice)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void setQty(item.id, 0)}
                      className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {item.message && (
                    <p className="mt-1 text-xs font-medium text-destructive" role="alert">
                      {item.message}
                    </p>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                    <QuantitySelector
                      size="sm"
                      value={item.qty}
                      min={0}
                      max={item.maxQty || item.qty}
                      onChange={(qty) => void setQty(item.id, qty)}
                      label={item.name}
                    />
                    <div className="text-right leading-tight">
                      <p className="price text-base font-bold">{formatINR(item.lineTotal)}</p>
                      {item.mrp > item.unitPrice && (
                        <p className="price text-xs text-muted-foreground line-through">{formatINR(item.mrp * item.qty)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {cart.warnings.map((warning) => (
            <p key={warning} className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {warning}
            </p>
          ))}
        </div>

        <aside className="h-fit space-y-3 lg:sticky lg:top-24">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-base font-bold">Bill details</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Item total" value={formatINR(cart.subtotal + savings)} />
              {savings > 0 && <Row label="Discount on MRP" value={`−${formatINR(savings)}`} tone="success" />}
              <Row
                label="Delivery fee"
                value={delivery === 0 ? "Free" : formatINR(delivery)}
                tone={delivery === 0 ? "success" : undefined}
              />
              <div className="flex items-baseline justify-between border-t pt-3">
                <dt className="text-base font-bold">To pay</dt>
                <dd className="price text-2xl font-extrabold">{formatINR(total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Have a coupon? Apply it at checkout.</p>
            <Link
              href="/checkout"
              aria-disabled={blocked || undefined}
              className={`mt-5 hidden h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary-dark md:flex ${blocked ? "pointer-events-none opacity-60" : ""}`}
            >
              Checkout
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {savings > 0 && (
            <p className="rounded-xl bg-success/10 px-4 py-3 text-center text-sm font-semibold text-success">
              You&apos;re saving {formatINR(savings)} on this order
            </p>
          )}
          <button
            type="button"
            onClick={openMealAssistant}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-card text-sm font-semibold transition-colors hover:border-foreground/30"
          >
            <ChefHat className="size-4 text-primary" aria-hidden />
            Get cooking ideas
          </button>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="You may also like" href="/shop" />
          <ProductRail products={more} />
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card px-4 py-3 shadow-float md:hidden">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <p className="price text-lg font-extrabold">{formatINR(total)}</p>
            <p className="text-xs text-muted-foreground">To pay</p>
          </div>
          <Link
            href="/checkout"
            aria-disabled={blocked || undefined}
            className={`ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold tracking-wide text-primary-foreground uppercase ${blocked ? "pointer-events-none opacity-60" : ""}`}
          >
            Checkout
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`price font-medium ${tone === "success" ? "text-success" : ""}`}>{value}</dd>
    </div>
  );
}
