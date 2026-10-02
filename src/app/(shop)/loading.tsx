import { CategoryGridSkeleton } from "@/components/site/category-tile";
import { ProductGridSkeleton } from "@/components/site/states";

export default function Loading() {
  return (
    <div className="space-y-6 pt-5 md:pt-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <CategoryGridSkeleton />
      <ProductGridSkeleton />
    </div>
  );
}
