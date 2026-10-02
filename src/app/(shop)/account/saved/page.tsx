"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { ProductGrid } from "@/components/site/product-card";
import { EmptyState, ProductGridSkeleton } from "@/components/site/states";
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

  if (!ready) return <ProductGridSkeleton count={3} />;
  if (!user) {
    return (
      <EmptyState
        icon={Heart}
        title="Sign in to see saved items"
        body="Tap the heart on any cut to keep it here."
        actionLabel="Sign in"
        href="/login?next=/account/saved"
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold">Saved items</h2>
      {products && products.length > 0 && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {products.length} item{products.length === 1 ? "" : "s"} saved for later
        </p>
      )}
      <div className="mt-4">
        {!products ? (
          <ProductGridSkeleton count={3} />
        ) : products.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet" body="Tap the heart on any cut to keep it here." actionLabel="Browse products" href="/shop" />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
