import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  return (
    <article className="max-w-2xl py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{TITLES[key]}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{settings.policies[key]}</p>
    </article>
  );
}
