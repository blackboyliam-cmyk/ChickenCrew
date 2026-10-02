"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/site/product-card";
import { EmptyState } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api } from "@/lib/api-client";
import type { ProductCardData } from "@/lib/types";

export default function SavedPage() {
  const { user, ready } = useShop();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ products: ProductCardData[] }>("/api/saved").then((data) => setProducts(data.products)).catch(() => setProducts([]));
  }, [user]);

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) return <Button asChild><Link href="/login?next=/account/saved">Sign in</Link></Button>;
  if (!products) return <p className="text-sm text-muted-foreground">Loading saved items…</p>;
  if (products.length === 0) {
    return <EmptyState title="No saved items" body="Save a cut from the shop and it will stay here." actionLabel="Browse products" href="/shop" />;
  }
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Saved items</h2>
      <ProductGrid products={products} />
    </div>
  );
}
