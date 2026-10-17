import type { Metadata } from "next";
import Link from "next/link";
import { BadgeIndianRupee, Clock, MapPin, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { getPublicSettings, withDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "About",
  description: "Fresh chicken cut to order and delivered locally. Learn about Karthika Chicken Centre and ChickenCrew.",
  alternates: { canonical: "/about" },
};

const PROMISES = [
  { icon: Sparkles, title: "Cut fresh to order", body: "Your chicken is cleaned and cut after you order, not hours before." },
  { icon: ShieldCheck, title: "Hygienic handling", body: "Washed, chilled and sealed in food-grade packs." },
  { icon: BadgeIndianRupee, title: "Honest prices", body: "The price you see is the price you pay. No surprise charges." },
  { icon: Truck, title: "Delivered in your slot", body: "Pick a time that suits you and we deliver to your door." },
];

export default async function AboutPage() {
  const settings = await withDb(getPublicSettings);
  const address = [settings.addressLine, settings.area, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ");

  return (
    <div className="pb-6">
      <PageHero eyebrow="Our story" title={`About ${settings.name}`} body={settings.about} />

      <section className="mt-8 md:mt-10">
        <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">What we promise</h2>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-white p-4 shadow-card sm:p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <p className="mt-3 font-bold sm:mt-4">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-2.5 sm:gap-3 md:mt-10 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-card sm:p-6">
          <p className="flex items-center gap-2 font-bold">
            <Truck className="size-4 text-primary" /> Where we deliver
          </p>
          <p className="mt-2 text-sm font-medium">Anywhere in Dombivili and Thakurli</p>
          {settings.servicePincodes.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {settings.servicePincodes.map((pin) => (
                <span key={pin} className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
                  {pin}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Delivery areas will be listed here soon.</p>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-card sm:p-6">
          <p className="flex items-center gap-2 font-bold">
            <MapPin className="size-4 text-primary" /> Visit the shop
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{address || "Shop address coming soon."}</p>
          {settings.hours && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4 text-muted-foreground" /> {settings.hours}
            </p>
          )}
        </div>
      </section>

      {settings.googleReviewsUrl && (
        <a
          href={settings.googleReviewsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-card hover:border-primary/40 sm:mt-10"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
            Read our Google reviews
          </span>
          <span className="text-xs font-bold text-primary">Open →</span>
        </a>
      )}

      <section className="mt-8 flex flex-col items-stretch gap-3 rounded-3xl bg-primary/5 p-5 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6 md:p-8">
        <div>
          <p className="text-lg font-extrabold">Ready for fresh chicken{settings.city ? ` in ${settings.city}` : ""}?</p>
          <p className="text-sm text-muted-foreground">Order now and pick a delivery slot that works for you.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild className="h-12 rounded-xl px-5 font-bold sm:h-11">
            <Link href="/shop">Shop now</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl px-5 font-bold sm:h-11">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
