import type { Metadata } from "next";
import { Listing } from "@/components/site/listing";
import { toQuery } from "@/lib/product-query";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse chicken cuts from Karthika Chicken Centre.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = toQuery(params);
  return (
    <Listing
      title={query.q ? `Results for “${query.q}”` : "All products"}
      description={query.q ? undefined : "Tap Add to put the default weight in your cart, or open a cut to pick another weight."}
      query={query}
      basePath="/shop"
    />
  );
}
