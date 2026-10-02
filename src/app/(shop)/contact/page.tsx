import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { getPublicSettings, withDb } from "@/lib/store";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const settings = await withDb(getPublicSettings);
  const phone = settings.phone;
  const whatsapp = settings.whatsapp.replace(/\D/g, "");
  const address = [settings.addressLine, settings.area, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ");
  const maps = settings.mapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
  return (
    <div className="max-w-2xl py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="font-medium">Phone</dt>
          <dd className="text-muted-foreground">{phone || "The shop has not added a phone number yet."}</dd>
        </div>
        <div>
          <dt className="font-medium">WhatsApp</dt>
          <dd className="text-muted-foreground">{settings.whatsapp || "The shop has not added WhatsApp yet."}</dd>
        </div>
        <div>
          <dt className="font-medium">Email</dt>
          <dd className="text-muted-foreground">{settings.email || "The shop has not added an email yet."}</dd>
        </div>
        <div>
          <dt className="font-medium">Address</dt>
          <dd className="text-muted-foreground">{address || "The shop has not added an address yet."}</dd>
        </div>
        <div>
          <dt className="font-medium">Opening hours</dt>
          <dd className="text-muted-foreground">{settings.hours || "The shop has not added opening hours yet."}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        {phone && (
          <Button asChild>
            <a href={`tel:${phone}`}>Call us</a>
          </Button>
        )}
        {whatsapp && (
          <Button asChild variant="outline">
            <a href={`https://wa.me/91${whatsapp.slice(-10)}`}>WhatsApp us</a>
          </Button>
        )}
        {maps && (
          <Button asChild variant="outline">
            <a href={maps} target="_blank" rel="noreferrer">Get directions</a>
          </Button>
        )}
      </div>
      {settings.mapUrl.includes("google.com/maps/embed") && (
        <iframe title="Shop location" src={settings.mapUrl} className="mt-6 h-64 w-full rounded-2xl border" loading="lazy" />
      )}
    </div>
  );
}
