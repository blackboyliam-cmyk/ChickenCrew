"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { PriceDisplay } from "@/components/site/money-view";
import { QuantitySelector } from "@/components/site/quantity-selector";
import { useShop } from "@/components/site/shop-context";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  price: number;
  mrp: number;
  stock: number;
  inStock: boolean;
  minQty: number;
  maxQty: number;
  discountPercent: number;
};

export function PurchasePanel({
  productId,
  name,
  variants,
}: {
  productId: string;
  name: string;
  variants: Variant[];
}) {
  const preferred =
    variants.find((variant) => variant.label === "500g" && variant.inStock) ||
    variants.find((variant) => variant.inStock) ||
    variants[0];
  const [variantId, setVariantId] = useState(preferred?.id || "");
  const [qty, setQty] = useState(preferred?.minQty || 1);
  const [busy, setBusy] = useState<"" | "add" | "buy">("");
  const { add, cart, settings } = useShop();
  const router = useRouter();
  const variant = variants.find((item) => item.id === variantId) || variants[0];

  if (!variant) {
    return <p className="text-sm text-muted-foreground">This product has no weights listed yet.</p>;
  }

  const inCart = cart?.items.find((item) => item.variantId === variant.id)?.qty || 0;
  const disabled = !variant.inStock || busy !== "";

  async function addToCart(buyNow = false) {
    if (!variant) return;
    setBusy(buyNow ? "buy" : "add");
    try {
      await add(productId, variant.id, qty);
      if (buyNow) router.push("/checkout");
    } catch {
      /* toast already shown */
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <PriceDisplay price={variant.price * qty} mrp={variant.mrp * qty} size="lg" />
      <p className="mt-1 text-xs text-muted-foreground">
        {qty > 1 ? `${formatINR(variant.price)} each · ` : ""}Inclusive of all taxes
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Select weight</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Select weight">
          {variants.map((item) => {
            const selected = item.id === variant.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!item.inStock}
                onClick={() => {
                  setVariantId(item.id);
                  setQty(item.minQty || 1);
                }}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors duration-150",
                  selected ? "border-primary bg-primary/[0.06] ring-1 ring-primary" : "bg-card hover:border-foreground/30",
                  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
                )}
              >
                <span className={cn("text-sm font-semibold", selected && "text-primary")}>{item.label}</span>
                <span className="price text-xs text-muted-foreground">
                  {item.inStock ? formatINR(item.price) : "Sold out"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold">Quantity</p>
          <QuantitySelector
            value={qty}
            min={variant.minQty || 1}
            max={Math.max(variant.minQty, variant.maxQty)}
            onChange={setQty}
            disabled={!variant.inStock}
            label={name}
          />
        </div>
        {inCart > 0 && (
          <p className="mt-7 flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" aria-hidden />
            {inCart} in cart
          </p>
        )}
      </div>

      {!variant.inStock && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm font-medium">This weight is sold out today.</p>
      )}

      <div className="mt-6 hidden gap-3 md:flex">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void addToCart(false)}
          className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
          Add to cart
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void addToCart(true)}
          className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-card text-sm font-bold tracking-wide uppercase transition-colors hover:border-foreground/40 disabled:opacity-60"
        >
          {busy === "buy" && <Loader2 className="size-4 animate-spin" />}
          Buy now
        </button>
      </div>

      <ul className="mt-6 grid gap-2 rounded-2xl bg-muted/70 p-4 text-sm sm:grid-cols-2">
        {(
          [
            "Freshly prepared",
            "Hygienically packed",
            "Choose your delivery slot",
            settings.onlineReady ? "Secure online payment" : settings.codEnabled ? "Cash on delivery" : null,
          ].filter(Boolean) as string[]
        ).map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" strokeWidth={2.75} aria-hidden />
              {item}
            </li>
          ))}
      </ul>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card px-4 py-3 shadow-float md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 leading-tight">
            <p className="price text-lg font-bold">{formatINR(variant.price * qty)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {variant.label}
              {qty > 1 ? ` × ${qty}` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void addToCart(false)}
            className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
            {variant.inStock ? "Add to cart" : "Sold out"}
          </button>
        </div>
      </div>
    </div>
  );
}
