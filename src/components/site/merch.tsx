import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { PriceDisplay } from "@/components/site/money-view";
import { formatINR } from "@/lib/money";
import type { ProductCardData } from "@/lib/types";

type OfferData = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  price: number | null;
  mrp: number | null;
};

export function OfferCard({ offer }: { offer: OfferData }) {
  const saving = offer.price != null && offer.mrp != null && offer.mrp > offer.price ? offer.mrp - offer.price : 0;
  return (
    <Link
      href={offer.href}
      className="group flex overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow duration-200 hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-muted sm:w-40">
        {offer.image && (
          <Image
            src={offer.image}
            alt={offer.imageAlt}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
        {saving > 0 && (
          <span className="absolute top-2 left-2 rounded-md bg-success px-1.5 py-0.5 text-[11px] font-bold text-white">
            SAVE {formatINR(saving)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="text-base leading-snug font-bold">{offer.title}</h3>
        {offer.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {offer.price != null ? (
            <PriceDisplay price={offer.price} mrp={offer.mrp || offer.price} size="sm" />
          ) : (
            <span />
          )}
          <span className="text-sm font-semibold text-primary">View deal →</span>
        </div>
      </div>
    </Link>
  );
}

export function ComboCard({ product }: { product: ProductCardData }) {
  return (
    <article className="relative flex overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow duration-200 hover:shadow-raised">
      <div className="relative w-[38%] shrink-0 bg-muted sm:w-48">
        {product.image && (
          <Image src={product.image} alt={product.imageAlt} fill sizes="(min-width: 640px) 192px, 38vw" className="object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">Combo</p>
        <h3 className="mt-1 text-base leading-snug font-bold sm:text-lg">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        {product.weightLabel && <p className="mt-0.5 text-xs text-muted-foreground">{product.weightLabel} total</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          <PriceDisplay price={product.price} mrp={product.mrp} showSaving />
          <AddToCartButton
            className="relative z-10"
            productId={product.id}
            variantId={product.defaultVariantId}
            name={product.name}
            inStock={product.inStock}
          />
        </div>
      </div>
    </article>
  );
}
