"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex justify-center py-16" role="alert">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page didn&apos;t load. Your cart is safe. Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button className="h-11 rounded-xl px-5 font-bold" onClick={reset}>
            <RotateCcw className="size-4" /> Try again
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl px-5 font-bold">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
