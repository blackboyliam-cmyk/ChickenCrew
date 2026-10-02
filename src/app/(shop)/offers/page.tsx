import type { Metadata } from "next";
import { TicketPercent } from "lucide-react";
import { OfferCard } from "@/components/site/merch";
import { ProductGrid } from "@/components/site/product-card";
import { EmptyState, SectionHeader } from "@/components/site/states";
import { listOffers, listProducts, withDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Offers",
  description: "Today's deals and discounted cuts from Karthika Chicken Centre.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage() {
  const { offers, discounted } = await withDb(() => ({
    offers: listOffers(),
    discounted: listProducts({ category: "offers", pageSize: "24" }).items,
  }));

  return (
    <div className="pt-5 md:pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-[32px]">Today&apos;s deals</h1>
      <p className="mt-1 text-sm text-muted-foreground">Prices and discounts are set by the shop and update live.</p>

      {offers.length === 0 && discounted.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={TicketPercent}
          title="No deals right now"
          body="Check back soon. Deals appear here as soon as the shop publishes them."
          actionLabel="Browse products"
          href="/shop"
        />
      ) : (
        <>
          {offers.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
          {discounted.length > 0 && (
            <section className="mt-10">
              <SectionHeader title="Cuts on discount" body="Below MRP today." />
              <ProductGrid products={discounted} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
