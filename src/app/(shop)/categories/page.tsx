import type { Metadata } from "next";
import { CategoryGrid } from "@/components/site/category-tile";
import { EmptyState } from "@/components/site/states";
import { listCategories, withDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Categories",
  description: "Shop chicken by cut — whole chicken, curry cut, boneless, breast, legs, wings and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = (await withDb(listCategories)).filter((c) => c.slug !== "offers");
  return (
    <div className="pt-5 md:pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-[32px]">Shop by Cut</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick a cut to see every weight and price.</p>
      {categories.length === 0 ? (
        <EmptyState className="mt-6" title="No categories yet" body="The shop hasn't published its categories." />
      ) : (
        <CategoryGrid categories={categories} layout="grid" className="mt-6" />
      )}
    </div>
  );
}
