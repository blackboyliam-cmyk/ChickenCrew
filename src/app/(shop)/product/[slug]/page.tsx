import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProductRail } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { PurchasePanel } from "@/components/site/purchase-panel";
import { SectionHeader } from "@/components/site/states";
import { ApiError } from "@/lib/errors";
import { getProduct, withDb } from "@/lib/store";

const SITE = "https://karthikachickencentre.shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await withDb(() => getProduct(slug));
    const variant =
      product.variants.find((item) => item.label === "500g" && item.inStock) ||
      product.variants.find((item) => item.inStock) ||
      product.variants[0];
    const title = variant ? `${product.name} ${variant.label}` : product.name;
    return {
      title,
      description: product.description,
      alternates: { canonical: `/product/${product.slug}` },
      openGraph: {
        title: `${title} | Karthika Chicken Centre`,
        description: product.description,
        images: product.images[0] ? [{ url: product.images[0].url, alt: product.images[0].alt }] : undefined,
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;
  try {
    product = await withDb(() => getProduct(slug));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const low = product.variants.reduce((min, variant) => Math.min(min, variant.price), product.variants[0]?.price || 0);
  const info = [
    ["About this cut", product.description],
    ["What you get", product.details],
    ["Preparation", product.preparation],
    ["Storage", product.storage],
  ].filter(([, body]) => body) as [string, string][];

  const crumbs = [
    { name: "Home", item: `${SITE}/` },
    ...(product.category ? [{ name: product.category.name, item: `${SITE}/category/${product.category.slug}` }] : []),
    { name: product.name, item: `${SITE}/product/${product.slug}` },
  ];

  return (
    <div className="pt-0 md:pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.images.map((image) => image.url),
          sku: product.variants[0]?.sku,
          brand: { "@type": "Brand", name: "Karthika Chicken Centre" },
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (low / 100).toFixed(2),
            availability: product.variants.some((variant) => variant.inStock)
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
        }}
      />

      <nav className="mb-4 hidden text-xs text-muted-foreground md:block" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span aria-hidden> / </span>
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
            <span aria-hidden> / </span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />
        <div className="md:pt-2">
          {product.category && (
            <Link
              href={`/category/${product.category.slug}`}
              className="text-xs font-semibold tracking-wide text-primary uppercase hover:underline"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-1 text-[26px] leading-tight font-extrabold tracking-tight md:text-[34px]">{product.name}</h1>
          {product.reviewCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
            </p>
          )}
          <div className="mt-5">
            <PurchasePanel productId={product.id} name={product.name} variants={product.variants} />
          </div>
        </div>
      </div>

      {info.length > 0 && (
        <section className="mt-10 grid gap-3 md:mt-14 md:grid-cols-2" aria-label="Product information">
          {info.map(([title, body]) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <h2 className="text-base font-bold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      )}

      {product.related.length > 0 && (
        <section className="mt-10 md:mt-14">
          <SectionHeader
            title={product.category ? `More ${product.category.name}` : "More cuts"}
            href={product.category ? `/category/${product.category.slug}` : "/shop"}
          />
          <ProductRail products={product.related} />
        </section>
      )}
    </div>
  );
}
