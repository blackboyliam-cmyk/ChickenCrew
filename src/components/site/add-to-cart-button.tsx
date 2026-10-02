"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { QuantitySelector } from "@/components/site/quantity-selector";
import { useShop } from "@/components/site/shop-context";
import { discountPercent } from "@/lib/pricing";
import { formatINR } from "@/lib/money";
import type { CardVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatGrams, parseGrams, planWeights, type Pack, type PackPlan } from "@/lib/weights";

/**
 * Card purchase control. When every pack is a weight, Add becomes a weight stepper
 * (e.g. 250g → 500g → 750g … 5 kg) built from the cheapest mix of the shop's packs.
 * Otherwise it falls back to a plain quantity stepper on the default pack.
 */
export function CardPurchase({
  productId,
  name,
  variants,
  defaultVariantId,
}: {
  productId: string;
  name: string;
  variants: CardVariant[];
  defaultVariantId: string | null;
}) {
  const plans = useMemo(() => {
    if (!variants.length || variants.some((item) => parseGrams(item.label) == null)) return [];
    const packs: Pack[] = variants
      .filter((item) => item.inStock)
      .map((item) => ({ id: item.id, grams: parseGrams(item.label)!, price: item.price, mrp: item.mrp, max: item.maxQty }));
    return planWeights(packs);
  }, [variants]);

  if (plans.length) {
    return <WeightPurchase productId={productId} name={name} variants={variants} plans={plans} />;
  }

  const variant = variants.find((item) => item.id === defaultVariantId) || variants[0];
  if (!variant) return <p className="mt-auto pt-3 text-xs text-muted-foreground">Coming soon</p>;
  return (
    <>
      <p className="mt-1 text-xs text-muted-foreground">{variant.label}</p>
      <div className="mt-auto pt-3">
        <PriceLine price={variant.price} mrp={variant.mrp} />
        <AddToCartButton
          className="relative z-10 mt-2 w-full"
          productId={productId}
          variantId={variant.id}
          name={`${name} ${variant.label}`}
          inStock={variant.inStock}
        />
      </div>
    </>
  );
}

function WeightPurchase({
  productId,
  name,
  variants,
  plans,
}: {
  productId: string;
  name: string;
  variants: CardVariant[];
  plans: PackPlan[];
}) {
  const { cart, add, setQty } = useShop();
  const [busy, setBusy] = useState(false);
  const gramsById = useMemo(() => new Map(variants.map((item) => [item.id, parseGrams(item.label) || 0])), [variants]);

  const lines = cart?.items.filter((item) => item.productId === productId) || [];
  const current = lines.reduce((sum, line) => sum + (gramsById.get(line.variantId) || 0) * line.qty, 0);
  const first = plans[0];
  const last = plans[plans.length - 1];
  const next = plans.find((plan) => plan.grams > current) || null;
  const prev = [...plans].reverse().find((plan) => plan.grams < current) || null;

  const price = current ? lines.reduce((sum, line) => sum + line.lineTotal, 0) : first.price;
  const mrp = current ? lines.reduce((sum, line) => sum + line.mrp * line.qty, 0) : first.mrp;

  async function goTo(plan: PackPlan | null) {
    setBusy(true);
    const desired = plan?.counts || {};
    const fresh = lines.length === 0;
    try {
      for (const line of lines) {
        const want = desired[line.variantId] || 0;
        if (want !== line.qty) await setQty(line.id, want);
      }
      const toAdd = Object.entries(desired).filter(([id, qty]) => qty > 0 && !lines.some((line) => line.variantId === id));
      for (const [index, [variantId, qty]] of toAdd.entries()) {
        await add(productId, variantId, qty, { silent: !(fresh && index === toAdd.length - 1) });
      }
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-1 text-xs text-muted-foreground">
        {first.grams === last.grams ? formatGrams(first.grams) : `${formatGrams(first.grams)} – ${formatGrams(last.grams)}`}
      </p>
      <div className="mt-auto pt-3">
        <PriceLine price={price} mrp={mrp} suffix={current ? undefined : `for ${formatGrams(first.grams)}`} />
        {current === 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void goTo(first)}
            aria-label={`Add ${formatGrams(first.grams)} of ${name} to cart`}
            className="relative z-10 mt-2 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-primary bg-card text-[13px] font-bold tracking-wide text-primary uppercase transition-colors duration-150 hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" strokeWidth={2.75} aria-hidden />}
            Add
          </button>
        ) : (
          <div
            role="group"
            aria-label={`Weight of ${name} in cart`}
            className="relative z-10 mt-2 flex h-9 w-full animate-fade-up items-center overflow-hidden rounded-lg bg-primary text-primary-foreground"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => void goTo(prev)}
              aria-label={prev ? `Reduce to ${formatGrams(prev.grams)}` : `Remove ${name} from cart`}
              className="grid h-full w-10 shrink-0 place-items-center transition-colors hover:bg-black/10 disabled:opacity-50"
            >
              <Minus className="size-4" strokeWidth={2.75} aria-hidden />
            </button>
            <span
              key={current}
              className={cn("flex-1 animate-pop text-center text-sm font-bold whitespace-nowrap tabular-nums", busy && "opacity-60")}
              aria-live="polite"
            >
              {formatGrams(current)}
            </span>
            <button
              type="button"
              disabled={busy || !next}
              onClick={() => void goTo(next)}
              aria-label={next ? `Increase to ${formatGrams(next.grams)}` : "Maximum weight reached"}
              className="grid h-full w-10 shrink-0 place-items-center transition-colors hover:bg-black/10 disabled:opacity-40"
            >
              <Plus className="size-4" strokeWidth={2.75} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PriceLine({ price, mrp, suffix }: { price: number; mrp: number; suffix?: string }) {
  const off = discountPercent(price, mrp);
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 leading-tight" aria-live="polite">
      <span className="price text-[15px] font-bold text-foreground sm:text-base">{formatINR(price)}</span>
      {off > 0 && <span className="price text-[11px] text-muted-foreground line-through">{formatINR(mrp)}</span>}
      {off > 0 && <span className="text-[11px] font-bold text-success">{off}% OFF</span>}
      {suffix && <span className="w-full text-[11px] text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export function AddToCartButton({
  productId,
  variantId,
  name,
  inStock,
  className,
}: {
  productId: string;
  variantId: string | null;
  name: string;
  inStock: boolean;
  className?: string;
}) {
  const { cart, add, setQty } = useShop();
  const [busy, setBusy] = useState(false);
  const line = variantId ? cart?.items.find((item) => item.variantId === variantId) : undefined;

  if (!inStock || !variantId) {
    return (
      <span className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted px-3 text-xs font-semibold text-muted-foreground", className)}>
        Sold out
      </span>
    );
  }

  if (line) {
    return (
      <QuantitySelector
        size="sm"
        className={cn("animate-fade-up justify-between", className)}
        value={line.qty}
        min={0}
        max={line.maxQty || 1}
        onChange={(qty) => void setQty(line.id, qty)}
        label={name}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await add(productId, variantId);
        } catch {
          /* toast already shown */
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "inline-flex h-9 min-w-[76px] items-center justify-center gap-1 rounded-lg border border-primary bg-card px-3 text-[13px] font-bold tracking-wide text-primary uppercase transition-colors duration-150",
        "hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-70",
        className,
      )}
      aria-label={`Add ${name} to cart`}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" strokeWidth={2.75} aria-hidden />}
      Add
    </button>
  );
}
