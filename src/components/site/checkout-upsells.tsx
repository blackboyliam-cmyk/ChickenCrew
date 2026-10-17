"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useShop } from "@/components/site/shop-context";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import type { ProductCardData } from "@/lib/types";

export function CheckoutUpsells() {
  const { cart, add } = useShop();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    api<{ items: ProductCardData[] }>("/api/products?pageSize=12&available=1")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  const inCart = new Set(cart?.items.map((item) => item.productId));
  const more = items.filter((item) => !inCart.has(item.id) && item.defaultVariantId && item.inStock).slice(0, 3);
  if (!more.length) return null;

  async function addOne(product: ProductCardData) {
    if (!product.defaultVariantId) return;
    setBusyId(product.id);
    try {
      await add(product.id, product.defaultVariantId, 1);
    } catch {
      /* toast already shown */
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4" aria-labelledby="upsell-title">
      <h3 id="upsell-title" className="text-sm font-bold">
        Add before you pay?
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Popular cuts that go well with your order.</p>
      <ul className="mt-3 space-y-2">
        {more.map((product) => (
          <li key={product.id} className="flex items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {product.image && <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{product.name}</span>
              <span className="price text-xs text-muted-foreground">
                {product.weightLabel} · {formatINR(product.price)}
              </span>
            </span>
            <button
              type="button"
              disabled={busyId === product.id}
              onClick={() => void addOne(product)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
