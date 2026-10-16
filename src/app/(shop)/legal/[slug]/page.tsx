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
    <div className="grid gap-5 pb-6 pt-4 md:grid-cols-[220px_1fr] md:gap-6 md:pt-8">
      <nav aria-label="Policies" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:sticky md:top-24 md:h-fit md:flex-col md:overflow-visible md:px-0">
        <p className="hidden px-3 pb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase md:block">Policies</p>
        {(Object.keys(TITLES) as (keyof typeof TITLES)[]).map((item) => (
          <Link
            key={item}
            href={`/legal/${item}`}
            className={cn(
              "h-11 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition md:h-auto md:py-2",
              item === key ? "bg-primary text-primary-foreground" : "bg-white text-foreground/80 hover:bg-muted md:bg-transparent",
            )}
          >
            {TITLES[item]}
          </Link>
        ))}
      </nav>
      <article className="rounded-2xl border bg-white p-5 shadow-card sm:rounded-3xl sm:p-6 md:p-10">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">{settings.name}</p>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight sm:text-2xl md:text-[32px]">{TITLES[key]}</h1>
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
