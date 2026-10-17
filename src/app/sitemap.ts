import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { listCategories, listProducts, withDb } from "@/lib/store";

export const dynamic = "force-dynamic";

type StaticEntry = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] };

const staticPages: StaticEntry[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/categories", priority: 0.9, changeFrequency: "daily" },
  { path: "/offers", priority: 0.8, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/refund", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/shipping", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const data = await withDb(() => ({
    categories: listCategories(),
    products: listProducts({ pageSize: "100" }).items,
  }));

  const staticEntries: MetadataRoute.Sitemap = staticPages.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const categories: MetadataRoute.Sitemap = data.categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const products: MetadataRoute.Sitemap = data.products.map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...categories, ...products];
}
