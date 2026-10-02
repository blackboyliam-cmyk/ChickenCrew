import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { getPublicSettings, withDb } from "@/lib/store";

const TITLES = {
  privacy: "Privacy policy",
  terms: "Terms & conditions",
  refund: "Refund policy",
  shipping: "Shipping / delivery policy",
} as const;

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => ({
    title: TITLES[slug as keyof typeof TITLES] || "Policy",
    alternates: { canonical: `/legal/${slug}` },
  }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const settings = await withDb(getPublicSettings);
  const key = slug as keyof typeof TITLES;
  const paragraphs = settings.policies[key].split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="grid gap-6 pb-6 pt-5 md:grid-cols-[220px_1fr] md:pt-8">
      <nav aria-label="Policies" className="flex gap-1.5 overflow-x-auto md:sticky md:top-24 md:h-fit md:flex-col">
        <p className="hidden px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground md:block">Policies</p>
        {(Object.keys(TITLES) as (keyof typeof TITLES)[]).map((item) => (
          <Link
            key={item}
            href={`/legal/${item}`}
            className={cn(
              "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition",
              item === key ? "bg-primary text-primary-foreground" : "bg-white text-foreground/80 hover:bg-muted md:bg-transparent",
            )}
          >
            {TITLES[item]}
          </Link>
        ))}
      </nav>
      <article className="rounded-3xl border bg-white p-6 shadow-card md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{settings.name}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[32px]">{TITLES[key]}</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-7 text-foreground/80">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-10 border-t pt-5 text-sm text-muted-foreground">
          Questions about this policy?{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
