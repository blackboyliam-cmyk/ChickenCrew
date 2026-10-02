import { discountPercent } from "@/lib/pricing";
import { formatINR } from "@/lib/money";

export function PriceDisplay({
  price,
  mrp,
  size = "md",
  showSaving = false,
}: {
  price: number;
  mrp: number;
  size?: "sm" | "md" | "lg";
  showSaving?: boolean;
}) {
  const off = discountPercent(price, mrp);
  if (size === "sm") {
    return (
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="price text-[15px] font-bold text-foreground sm:text-base">{formatINR(price)}</span>
        {off > 0 && <span className="price text-[11px] text-muted-foreground line-through">{formatINR(mrp)}</span>}
      </div>
    );
  }
  const priceClass = size === "lg" ? "text-[28px] md:text-[32px]" : "text-xl";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`price font-bold text-foreground ${priceClass}`}>{formatINR(price)}</span>
      {off > 0 && (
        <>
          <span className="price text-sm text-muted-foreground line-through">MRP {formatINR(mrp)}</span>
          <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-xs font-bold text-success">
            {showSaving ? `SAVE ${formatINR(mrp - price)}` : `${off}% OFF`}
          </span>
        </>
      )}
    </div>
  );
}
