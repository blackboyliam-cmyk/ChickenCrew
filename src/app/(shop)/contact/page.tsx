import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getPublicSettings, withDb } from "@/lib/store";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const settings = await withDb(getPublicSettings);
  const phone = settings.phone;
  const whatsapp = settings.whatsapp.replace(/\D/g, "");
  const address = [settings.addressLine, settings.area, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ");
  const maps = settings.mapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");

  const cards = [
    { icon: Phone, label: "Call us", value: phone, href: phone ? `tel:${phone}` : "", cta: "Call now" },
    { icon: MessageCircle, label: "WhatsApp", value: settings.whatsapp, href: whatsapp ? `https://wa.me/91${whatsapp.slice(-10)}` : "", cta: "Start a chat" },
    { icon: Mail, label: "Email", value: settings.email, href: settings.email ? `mailto:${settings.email}` : "", cta: "Send an email" },
    { icon: MapPin, label: "Shop address", value: address, href: maps, cta: "Get directions" },
  ];

  return (
    <div className="pb-6">
      <PageHero eyebrow="We're here to help" title="Contact us" body="Questions about an order, a cut, or delivery? Reach us the way that suits you." />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {cards.map(({ icon: Icon, label, value, href, cta }) => {
          const external = href.startsWith("http");
          const body = (
            <>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 break-words font-bold">{value || "Coming soon"}</p>
                {href && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {cta} <ArrowUpRight className="size-3.5" />
                  </p>
                )}
              </div>
            </>
          );
          const className = "flex gap-4 rounded-2xl border bg-white p-5 shadow-card";
          return href ? (
            <a
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              className={`${className} transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float`}
            >
              {body}
            </a>
          ) : (
            <div key={label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-card">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening hours</p>
          <p className="mt-0.5 font-bold">{settings.hours || "Coming soon"}</p>
        </div>
      </div>

      {settings.mapUrl.includes("google.com/maps/embed") && (
        <iframe title="Shop location" src={settings.mapUrl} className="mt-6 h-72 w-full rounded-3xl border shadow-card" loading="lazy" />
      )}
    </div>
  );
}
