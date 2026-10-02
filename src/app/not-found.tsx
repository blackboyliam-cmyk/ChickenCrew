import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4f0] px-4">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-float">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <SearchX className="size-7" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">Error 404</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be old, or the item is no longer on sale.</p>
        <div className="mt-7 flex justify-center gap-2">
          <Button asChild className="h-11 rounded-xl px-5 font-bold">
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl px-5 font-bold">
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
