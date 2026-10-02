"use client";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Something went wrong.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
      <button type="button" className="mt-6 h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
