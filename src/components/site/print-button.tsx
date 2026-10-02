"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark"
    >
      <Printer className="size-4" aria-hidden />
      Print / Save PDF
    </button>
  );
}
