"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/site/logo";
import { cn } from "@/lib/utils";

/** Branded screen shown while the site first loads; fades out once the page is interactive. */
export function SplashScreen() {
  const [phase, setPhase] = useState<"shown" | "fading" | "gone">("shown");

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    const hide = () => {
      setPhase("fading");
      fadeTimer = setTimeout(() => setPhase("gone"), 400);
    };
    const minTimer = setTimeout(() => {
      if (document.readyState === "complete") hide();
      else window.addEventListener("load", hide, { once: true });
    }, 350);
    const maxTimer = setTimeout(hide, 2500);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      clearTimeout(fadeTimer);
      window.removeEventListener("load", hide);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      aria-hidden
      className={cn(
        "splash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background transition-opacity duration-400 print:hidden",
        phase === "fading" && "pointer-events-none opacity-0",
      )}
    >
      <span className="grid size-20 animate-[splash-pop_700ms_var(--ease-snappy)_both] place-items-center rounded-3xl bg-primary text-primary-foreground shadow-float">
        <Mark className="size-10" />
      </span>
      <span className="text-center">
        <span className="block font-[family-name:var(--font-plus-jakarta)] text-xl font-extrabold tracking-tight">
          Chicken<span className="text-primary">Crew</span>
        </span>
        <span className="mt-1 block text-xs font-medium text-muted-foreground">by Karthika Chicken Centre</span>
      </span>
      <span className="relative mt-2 h-1 w-28 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-[splash-bar_1s_ease-in-out_infinite] rounded-full bg-primary" />
      </span>
    </div>
  );
}
