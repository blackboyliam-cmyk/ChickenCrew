import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center px-4">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page is not on ChickenCrew.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-primary">
        Back home
      </Link>
    </main>
  );
}
