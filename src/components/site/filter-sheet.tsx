"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SortOption = { label: string; href: string; active: boolean };

/** Mobile-only sticky Filter / Sort bar. The filter form itself is rendered by the server and passed in. */
export function MobileFilterBar({
  activeFilters,
  sortOptions,
  children,
}: {
  activeFilters: number;
  sortOptions: SortOption[];
  children: React.ReactNode;
}) {
  const [panel, setPanel] = useState<"" | "filter" | "sort">("");
  const current = sortOptions.find((option) => option.active);

  return (
    <>
      <div className="sticky top-[96px] z-30 -mx-4 mb-4 grid grid-cols-2 border-y bg-card/95 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={() => setPanel("filter")}
          className="flex h-12 items-center justify-center gap-2 border-r text-sm font-semibold"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
          {activeFilters > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPanel("sort")}
          className="flex h-12 items-center justify-center gap-2 text-sm font-semibold"
        >
          <ArrowUpDown className="size-4" aria-hidden />
          Sort
          {current && <span className="max-w-24 truncate font-normal text-muted-foreground">· {current.label}</span>}
        </button>
      </div>

      <Sheet open={panel !== ""} onOpenChange={(open) => !open && setPanel("")}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>{panel === "sort" ? "Sort by" : "Filter"}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            {panel === "sort" ? (
              <ul className="space-y-1">
                {sortOptions.map((option) => (
                  <li key={option.label}>
                    <Link
                      href={option.href}
                      onClick={() => setPanel("")}
                      className={cn(
                        "flex h-12 items-center justify-between rounded-xl px-3 text-[15px]",
                        option.active ? "bg-primary/[0.06] font-semibold text-primary" : "hover:bg-muted",
                      )}
                    >
                      {option.label}
                      {option.active && <Check className="size-4" aria-hidden />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div onSubmit={() => setPanel("")}>{children}</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
