import Link from "next/link";
import { CategoryIcon } from "@/components/site/category-icons";
import { cn } from "@/lib/utils";

export type CategoryTileData = {
  id: string;
  slug: string;
  name: string;
  image?: string | null;
  imageAlt?: string;
  productCount: number;
};

export function CategoryTile({
  category,
  active = false,
  className,
}: {
  category: CategoryTileData;
  active?: boolean;
  className?: string;
}) {
  const count = category.productCount;
  return (
    <Link
      href={`/category/${category.slug}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-full flex-col items-center gap-2 rounded-2xl border bg-card px-2 pt-3 pb-3.5 text-center transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-snappy)]",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.04]",
        "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        active ? "border-primary bg-primary/[0.06]" : "border-border",
        className,
      )}
    >
      <span className="grid aspect-square w-full max-w-24 place-items-center p-1.5 transition-transform duration-200 group-hover:scale-105">
        <CategoryIcon slug={category.slug} className={active ? "text-primary" : "group-hover:text-primary"} />
      </span>
      <span className="space-y-0.5">
        <span
          className={cn(
            "block text-[13px] leading-tight font-semibold sm:text-sm",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {category.name}
        </span>
        <span className="block text-[11px] text-muted-foreground sm:text-xs">
          {count === 0 ? "Coming soon" : `${count} ${count === 1 ? "product" : "products"}`}
        </span>
      </span>
    </Link>
  );
}

/** `rail` scrolls sideways on phones and becomes a grid from `sm` up; `grid` is a grid at every size. */
export function CategoryGrid({
  categories,
  activeSlug,
  layout = "rail",
  className,
}: {
  categories: CategoryTileData[];
  activeSlug?: string;
  layout?: "rail" | "grid";
  className?: string;
}) {
  const rail = layout === "rail";
  return (
    <div
      className={cn(
        rail
          ? "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-8"
          : "grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6",
        className,
      )}
    >
      {categories.map((category) => (
        <CategoryTile
          key={category.id}
          category={category}
          active={category.slug === activeSlug}
          className={rail ? "w-[104px] shrink-0 snap-start sm:w-auto" : undefined}
        />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0 lg:grid-cols-8">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-[150px] w-[104px] shrink-0 animate-pulse rounded-2xl bg-muted sm:w-auto" />
      ))}
    </div>
  );
}
