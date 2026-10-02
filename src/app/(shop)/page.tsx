import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, MapPin, Truck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CategoryGrid } from "@/components/site/category-tile";
import { ComboCard, OfferCard } from "@/components/site/merch";
import { ProductGrid } from "@/components/site/product-card";
import { EmptyState, SectionHeader } from "@/components/site/states";
import { JsonLd } from "@/components/site/json-ld";
import { formatINR } from "@/lib/money";
import { getHome, listProducts, withDb } from "@/lib/store";

export default async function HomePage() {
  const { home, combos } = await withDb(() => ({
    home: getHome(),
    combos: listProducts({ category: "combos", pageSize: "4" }).items,
  }));
  const { settings } = home;
  const categories = home.categories.filter((c) => c.slug !== "offers" && c.slug !== "combos").slice(0, 8);
  const nextSlot = home.delivery.slotSummary[0];

  const trust = [
    "Freshly prepared",
    "Hygienically packed",
    "Flexible delivery slots",
    settings.onlineReady ? "Secure online payments" : settings.codEnabled ? "Cash on delivery" : null,
  ].filter(Boolean) as string[];

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.name,
    url: "https://karthikachickencentre.shop",
    brand: settings.brand,
  };
  if (settings.phone) business.telephone = settings.phone;
  if (settings.city) {
    business.address = {
      "@type": "PostalAddress",
      streetAddress: [settings.addressLine, settings.area].filter(Boolean).join(", "),
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.pincode,
      addressCountry: "IN",
    };
  }

  return (
    <>
      <JsonLd data={business} />

      {/* Hero */}
      <section className="grid items-center gap-x-12 gap-y-5 pt-5 pb-8 md:pt-10 md:pb-14 lg:grid-cols-[1fr_1.05fr]">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="text-xs font-semibold text-primary md:text-sm">{settings.name}</p>
          <h1 className="mt-2 text-[34px] leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-[56px]">
            Fresh Chicken.
            <br />
            Honest Prices.
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground md:mt-4 md:text-lg">
            Freshly prepared cuts, packed with care and delivered to your doorstep.
          </p>
        </div>

        <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-charcoal md:rounded-3xl lg:aspect-[5/4]">
            <Image
              src="/media/hero.jpg"
              alt="Fresh whole chicken on a wooden board"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {nextSlot && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 shadow-raised md:bottom-5 md:left-5">
              <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="leading-tight">
                <span className="block text-[11px] text-muted-foreground">Next delivery slot</span>
                <span className="block text-sm font-bold">{nextSlot}</span>
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:gap-3">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary-dark md:h-[52px] md:px-8"
            >
              Order now
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#shop-by-cut"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-foreground/15 bg-card px-6 text-sm font-bold tracking-wide uppercase transition-colors hover:border-foreground/30 md:h-[52px] md:px-8"
            >
              Explore cuts
            </Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-foreground/80">
            {trust.slice(0, 3).map((label) => (
              <li key={label} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" strokeWidth={2.75} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Shop by cut */}
      <section id="shop-by-cut" className="scroll-mt-32 py-6 md:py-10">
        <SectionHeader title="Shop by Cut" href="/categories" linkLabel="All" />
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" body="The shop hasn't published its categories." />
        ) : (
          <CategoryGrid categories={categories} />
        )}
      </section>

      {/* Popular */}
      <section className="py-6 md:py-10">
        <SectionHeader title="Popular Picks" body="Chosen by the shop. Live prices and stock." href="/shop" />
        {home.featured.length === 0 ? (
          <EmptyState
            title="Nothing featured yet"
            body="The shop hasn't picked featured cuts. Browse everything instead."
            actionLabel="Browse shop"
            href="/shop"
          />
        ) : (
          <ProductGrid products={home.featured.slice(0, 8)} />
        )}
      </section>

      {/* Deals */}
      {home.offers.length > 0 && (
        <section className="py-6 md:py-10">
          <SectionHeader title="Fresh Deals" body="Set by the shop for today." href="/offers" />
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {home.offers.slice(0, 4).map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      )}

      {/* Combos */}
      {combos.length > 0 && (
        <section className="py-6 md:py-10">
          <SectionHeader title="Combos & Family Packs" body="More cuts in one order, priced together." href="/category/combos" />
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {combos.map((product) => (
              <ComboCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* How it works + trust */}
      <section className="py-6 md:py-10">
        <div className="rounded-3xl bg-charcoal p-6 text-white md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ordering takes a minute.</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                {trust.map((label) => (
                  <li key={label} className="flex items-center gap-2">
                    <Check className="size-4 text-[#4ade80]" strokeWidth={2.75} aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                ["Pick your cut", "Choose the weight you need and tap Add."],
                ["Choose a slot", "Pick a delivery time that suits you."],
                [
                  "Pay your way",
                  settings.onlineReady && settings.codEnabled
                    ? "UPI, cards, or cash on delivery."
                    : settings.onlineReady
                      ? "UPI, cards, net banking or wallets."
                      : "Cash on delivery.",
                ],
              ].map(([title, body], index) => (
                <li key={title} className="rounded-2xl bg-white/[0.06] p-5">
                  <span className="text-sm font-bold text-[#f87171]">0{index + 1}</span>
                  <h3 className="mt-2 text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-white/70">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Quality + delivery */}
      <section className="grid gap-4 py-6 md:py-10 lg:grid-cols-2">
        <div className="relative min-h-64 overflow-hidden rounded-3xl bg-muted lg:min-h-full">
          <Image
            src="/media/breast.jpg"
            alt="Raw chicken breast on a wooden board"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="rounded-3xl border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Cut when you order.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            Your order is prepared for the slot you choose and packed for the trip to your kitchen. Refrigerate it
            when it arrives. Weights shown are packed weights.
          </p>
          <dl className="mt-6 divide-y rounded-2xl border">
            {[
              {
                icon: Truck,
                label: "Delivery fee",
                value: home.delivery.fee === 0 ? "Free" : formatINR(home.delivery.fee),
                note:
                  home.delivery.freeAbove != null && home.delivery.fee > 0
                    ? `Free on orders above ${formatINR(home.delivery.freeAbove)}`
                    : null,
              },
              {
                icon: CalendarClock,
                label: "Next slots",
                value: nextSlot || "Not published yet",
                note: home.delivery.slotSummary.slice(1, 3).join(" · ") || null,
              },
              {
                icon: MapPin,
                label: "Delivering to",
                value: home.delivery.pincodes.length
                  ? `${home.delivery.pincodes.length} ${home.delivery.pincodes.length === 1 ? "pincode" : "pincodes"}`
                  : "Not published yet",
                note: home.delivery.pincodes.length ? home.delivery.pincodes.join(", ") : null,
              },
            ].map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="flex gap-3 p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-[15px] font-bold">{value}</dd>
                  {note && <dd className="mt-0.5 text-xs text-muted-foreground">{note}</dd>}
                </div>
              </div>
            ))}
          </dl>
          <Link href="/legal/shipping" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Delivery policy →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      {home.faqs.length > 0 && (
        <section className="grid gap-4 py-6 md:py-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">Questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Can&apos;t find an answer?{" "}
              <Link href="/contact" className="font-semibold text-primary hover:underline">
                Contact the shop
              </Link>
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4 md:px-6">
            {home.faqs.slice(0, 6).map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}>
                <AccordionTrigger className="py-4 text-[15px] font-semibold hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </>
  );
}
