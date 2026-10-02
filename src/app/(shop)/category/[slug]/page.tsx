import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/site/listing";
import { JsonLd } from "@/components/site/json-ld";
import { listCategories, withDb } from "@/lib/store";
import { toQuery } from "@/lib/product-query";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = (await withDb(listCategories)).find((item) => item.slug === slug);
  if (!category) return { title: "Category" };
  return {
    title: category.name,
    description: `Order ${category.name.toLowerCase()} from Karthika Chicken Centre.`,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: { title: `${category.name} | Karthika Chicken Centre` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = (await withDb(listCategories)).find((item) => item.slug === slug);
  if (!category) notFound();
  const query = { ...toQuery(await searchParams), category: slug };
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://karthikachickencentre.shop/" },
            { "@type": "ListItem", position: 2, name: "Shop", item: "https://karthikachickencentre.shop/shop" },
            { "@type": "ListItem", position: 3, name: category.name, item: `https://karthikachickencentre.shop/category/${slug}` },
          ],
        }}
      />
      <Listing title={category.name} query={query} basePath={`/category/${slug}`} />
    </>
  );
}
