import type { MetadataRoute } from "next";
import { listCategories, listProducts, withDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://karthikachickencentre.shop";
  const staticPaths = ["", "/shop", "/categories", "/offers", "/about", "/contact", "/faq", "/legal/privacy", "/legal/terms", "/legal/refund", "/legal/shipping"];
  const data = await withDb(() => ({
    categories: listCategories(),
    products: listProducts({ pageSize: "100" }).items,
  }));
  const categories = data.categories.map((category) => ({
    url: `${site}/category/${category.slug}`,
    changeFrequency: "daily" as const,
  }));
  const products = data.products.map((product) => ({
    url: `${site}/product/${product.slug}`,
    changeFrequency: "daily" as const,
  }));
  return [
    ...staticPaths.map((path) => ({ url: `${site}${path || "/"}`, changeFrequency: "daily" as const })),
    ...categories,
    ...products,
  ];
}
