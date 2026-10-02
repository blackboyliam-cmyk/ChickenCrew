"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  value,
  min = 1,
  max = 10,
  onChange,
  disabled,
  size = "md",
  label,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const sm = size === "sm";
  const button = cn(
    "grid h-full place-items-center transition-colors duration-150 hover:bg-black/10 focus-visible:bg-black/10 focus-visible:outline-none disabled:opacity-40",
    sm ? "w-9" : "w-11",
  );
  return (
    <div
      role="group"
      aria-label={label ? `Quantity of ${label}` : "Quantity"}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
        sm ? "h-9 min-w-[76px]" : "h-11",
        className,
      )}
    >
      <button
        type="button"
        className={button}
        aria-label={value - 1 < 1 && min === 0 ? "Remove from cart" : "Decrease quantity"}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" strokeWidth={2.75} aria-hidden />
      </button>
      <span
        key={value}
        className={cn("animate-pop text-center font-bold tabular-nums", sm ? "min-w-5 text-sm" : "min-w-8 text-base")}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={button}
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" strokeWidth={2.75} aria-hidden />
      </button>
    </div>
  );
}
