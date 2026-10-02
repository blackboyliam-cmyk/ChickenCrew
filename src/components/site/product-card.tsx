import Image from "next/image";
import Link from "next/link";
import { CardPurchase } from "@/components/site/add-to-cart-button";
import { discountPercent } from "@/lib/pricing";
import type { ProductCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const offs = product.variants.filter((item) => item.inStock).map((item) => discountPercent(item.price, item.mrp));
  const best = offs.length ? Math.max(...offs) : 0;
  const varied = best > 0 && offs.some((off) => off !== best);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow duration-200 hover:shadow-raised">
      <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[5/4]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-300 ease-[var(--ease-snappy)] group-hover:scale-[1.04]",
              !product.inStock && "grayscale",
            )}
          />
        ) : (
          <span className="grid h-full place-items-center text-xs text-muted-foreground">Photo coming soon</span>
        )}
        {best > 0 && product.inStock && (
          <span className="absolute top-2 left-2 rounded-md bg-success px-1.5 py-0.5 text-[11px] font-bold text-white">
            {varied ? `UP TO ${best}% OFF` : `${best}% OFF`}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-md bg-charcoal/85 py-1 text-center text-[11px] font-semibold text-white">
            Sold out today
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm leading-[1.25] font-semibold text-foreground sm:text-[15px]">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        <CardPurchase
          productId={product.id}
          name={product.name}
          variants={product.variants}
          defaultVariantId={product.defaultVariantId}
        />
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}

/** Single horizontal row for "popular in", "you may also like" and similar strips. */
export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0">
      {products.map((product) => (
        <div key={product.id} className="w-[44vw] max-w-[200px] shrink-0 snap-start md:w-auto md:max-w-none">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
