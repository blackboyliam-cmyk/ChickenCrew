import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionLabel,
  href,
  icon: Icon = PackageOpen,
  className,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  href?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {actionLabel && href && (
        <Button asChild className="mt-6 h-11 rounded-xl px-6 font-semibold">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong.",
  body = "Please try again.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center" role="alert">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {onRetry && (
        <Button className="mt-6 h-11 rounded-xl px-6 font-semibold" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-square w-full rounded-none sm:aspect-[5/4]" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex items-end justify-between pt-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-9 w-[76px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-2xl border bg-card p-3">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionHeader({
  title,
  body,
  href,
  linkLabel = "View all",
  as: Tag = "h2",
}: {
  title: string;
  body?: string;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
      <div className="min-w-0">
        <Tag className={cn("font-extrabold tracking-tight", Tag === "h1" ? "text-2xl md:text-[32px]" : "text-xl md:text-2xl")}>
          {title}
        </Tag>
        {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-primary hover:bg-primary/[0.05]"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
