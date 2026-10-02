import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import { MobileFilterBar, type SortOption } from "@/components/site/filter-sheet";
import { ProductGrid } from "@/components/site/product-card";
import { EmptyState } from "@/components/site/states";
import { listCategories, listProducts, listWeights, withDb, type ProductQuery } from "@/lib/store";
import { cn } from "@/lib/utils";

const SORTS = [
  ["popular", "Popular"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["newest", "Newest"],
] as const;

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

export async function Listing({
  title,
  description,
  query,
  basePath,
}: {
  title: string;
  description?: string;
  query: ProductQuery;
  basePath: string;
}) {
  const { data, allCategories, weights } = await withDb(() => ({
    data: listProducts(query),
    allCategories: listCategories(),
    weights: listWeights(),
  }));
  const categories = allCategories.filter((category) => category.slug !== "offers");
  const page = data.page;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const onCategoryPage = basePath.startsWith("/category/");

  function href(next: Partial<Record<keyof ProductQuery, string | undefined>>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...query, ...next };
    if (onCategoryPage) delete merged.category;
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const chips = [
    query.q && { label: `“${query.q}”`, href: href({ q: undefined, page: undefined }) },
    query.min && { label: `From ₹${query.min}`, href: href({ min: undefined, page: undefined }) },
    query.max && { label: `Up to ₹${query.max}`, href: href({ max: undefined, page: undefined }) },
    query.weight && { label: query.weight, href: href({ weight: undefined, page: undefined }) },
    query.available === "1" && { label: "In stock", href: href({ available: undefined, page: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];
  const activeFilters = chips.filter((chip) => !chip.label.startsWith("“")).length;

  const sortOptions: SortOption[] = SORTS.map(([value, label]) => ({
    label,
    href: href({ sort: value === "popular" ? undefined : value, page: undefined }),
    active: (query.sort || "popular") === value,
  }));

  const filterForm = (idPrefix: string) => (
    <form method="get" action={basePath} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold" htmlFor={`${idPrefix}-min`}>
          Min price (₹)
          <input id={`${idPrefix}-min`} name="min" defaultValue={query.min || ""} inputMode="numeric" className={inputClass} />
        </label>
        <label className="block text-sm font-semibold" htmlFor={`${idPrefix}-max`}>
          Max price (₹)
          <input id={`${idPrefix}-max`} name="max" defaultValue={query.max || ""} inputMode="numeric" className={inputClass} />
        </label>
      </div>
      {weights.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold">Weight</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {["", ...weights].map((weight) => (
              <label key={weight || "any"} className="cursor-pointer">
                <input
                  type="radio"
                  name="weight"
                  value={weight}
                  defaultChecked={(query.weight || "") === weight}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-lg border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary/[0.06] peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40">
                  {weight || "Any"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="available"
          value="1"
          defaultChecked={query.available === "1"}
          className="size-5 rounded accent-[var(--primary)]"
        />
        In stock only
      </label>
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.sort && <input type="hidden" name="sort" value={query.sort} />}
      <div className="flex gap-2">
        <Link
          href={href({ min: undefined, max: undefined, weight: undefined, available: undefined, page: undefined })}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold hover:bg-muted"
        >
          Clear
        </Link>
        <button className="h-11 flex-[2] rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-dark" type="submit">
          Show results
        </button>
      </div>
    </form>
  );

  return (
    <div className="pt-5 md:pt-8">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span aria-hidden> / </span>
        {onCategoryPage ? (
          <>
            <Link href="/shop" className="hover:text-foreground">
              Shop
            </Link>
            <span aria-hidden> / </span>
            <span className="text-foreground">{title}</span>
          </>
        ) : (
          <span className="text-foreground">Shop</span>
        )}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[32px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        <CategoryChip href="/shop" active={!query.category} label="All" />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            href={`/category/${category.slug}`}
            active={query.category === category.slug}
            label={category.name}
          />
        ))}
      </nav>

      <div className="mt-4 grid gap-8 lg:mt-6 lg:grid-cols-[248px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6 rounded-2xl border bg-card p-5">
            <nav aria-label="Categories">
              <p className="text-sm font-semibold">Categories</p>
              <ul className="mt-2 -mx-2 space-y-0.5 text-sm">
                <li>
                  <SideLink href="/shop" active={!query.category} label="All cuts" />
                </li>
                {categories.map((category) => (
                  <li key={category.id}>
                    <SideLink
                      href={`/category/${category.slug}`}
                      active={query.category === category.slug}
                      label={category.name}
                      count={category.productCount}
                    />
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t pt-5">{filterForm("d")}</div>
          </div>
        </aside>

        <div className="min-w-0">
          <MobileFilterBar activeFilters={activeFilters} sortOptions={sortOptions}>
            {filterForm("m")}
          </MobileFilterBar>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-semibold text-foreground">{data.total}</span> {data.total === 1 ? "product" : "products"}
            </p>
            <div className="hidden items-center gap-1 lg:flex" role="group" aria-label="Sort">
              <span className="mr-1 text-sm text-muted-foreground">Sort:</span>
              {sortOptions.map((option) => (
                <Link
                  key={option.label}
                  href={option.href}
                  aria-current={option.active ? "true" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    option.active ? "bg-charcoal font-semibold text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link
                    href={chip.href}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card pr-2 pl-3 text-sm font-medium hover:border-foreground/30"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label}
                    <X className="size-3.5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No cuts found"
              body={chips.length ? "Try removing a filter or searching for something else." : "Nothing is listed here yet."}
              actionLabel="See all products"
              href="/shop"
            />
          ) : (
            <ProductGrid products={data.items} priorityCount={4} />
          )}

          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <PageLink href={page > 1 ? href({ page: String(page - 1) }) : null} label="Previous page">
                <ChevronLeft className="size-4" />
              </PageLink>
              <span className="px-3 text-sm">
                Page <span className="font-semibold">{page}</span> of {pages}
              </span>
              <PageLink href={page < pages ? href({ page: String(page + 1) }) : null} label="Next page">
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-lg border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "border-primary bg-primary/[0.06] text-primary" : "bg-card hover:border-foreground/30",
      )}
    >
      {label}
    </Link>
  );
}

function SideLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center justify-between rounded-lg px-2 transition-colors",
        active ? "bg-primary/[0.06] font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count != null && <span className="text-xs text-muted-foreground">{count}</span>}
    </Link>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="grid size-11 place-items-center rounded-xl border text-muted-foreground/50" aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="grid size-11 place-items-center rounded-xl border bg-card hover:bg-muted">
      {children}
    </Link>
  );
}
