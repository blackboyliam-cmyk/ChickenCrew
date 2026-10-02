import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPublicSettings, withDb } from "@/lib/store";

export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const settings = await withDb(getPublicSettings);
  return (
    <article className="max-w-2xl py-8">
      <h1 className="text-3xl font-semibold tracking-tight">About {settings.name}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{settings.about}</p>
      <h2 className="mt-8 text-xl font-semibold">What you can order</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The cuts, weights, prices, and stock on this site come from the shop. If a price changes, the new price is what you see before you pay.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Service area</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {settings.servicePincodes.length
          ? `Orders are delivered to ${settings.servicePincodes.join(", ")}.`
          : "The shop has not published its delivery pincodes yet. Checkout stays closed until it does."}
      </p>
      {(settings.addressLine || settings.city) && (
        <>
          <h2 className="mt-8 text-xl font-semibold">Shop</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {[settings.addressLine, settings.area, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}
          </p>
        </>
      )}
      <Button asChild className="mt-8">
        <Link href="/contact">Contact the shop</Link>
      </Button>
    </article>
  );
}
