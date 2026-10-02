"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader, ErrorBanner, Field, Panel, SubmitButton, Toggle, attempt, saveAdmin, toRupees, useAdmin } from "@/components/admin/forms";
import { Button } from "@/components/ui/button";
import type { ShopSettings } from "@/lib/types";

type Form = {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  mapUrl: string;
  about: string;
  servicePincodes: string;
  deliveryFee: string;
  freeDeliveryAbove: string;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  starterCatalogue: boolean;
  privacy: string;
  terms: string;
  refund: string;
  shipping: string;
};

const fromSettings = (s: ShopSettings): Form => ({
  name: s.name,
  tagline: s.tagline,
  phone: s.phone,
  whatsapp: s.whatsapp,
  email: s.email,
  hours: s.hours,
  addressLine: s.addressLine,
  area: s.area,
  city: s.city,
  state: s.state,
  pincode: s.pincode,
  mapUrl: s.mapUrl,
  about: s.about,
  servicePincodes: s.servicePincodes.join(", "),
  deliveryFee: toRupees(s.deliveryFee),
  freeDeliveryAbove: toRupees(s.freeDeliveryAbove),
  codEnabled: s.codEnabled,
  onlinePaymentEnabled: s.onlinePaymentEnabled,
  starterCatalogue: s.starterCatalogue,
  privacy: s.policies?.privacy ?? "",
  terms: s.policies?.terms ?? "",
  refund: s.policies?.refund ?? "",
  shipping: s.policies?.shipping ?? "",
});

const SECTIONS = [
  ["store", "Store"],
  ["contact", "Contact"],
  ["address", "Address"],
  ["delivery", "Delivery"],
  ["payments", "Payments"],
  ["policies", "Policies"],
] as const;

export default function SettingsAdmin() {
  const { data, error, reload } = useAdmin<{ settings: ShopSettings }>("/api/admin/settings");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(fromSettings(data.settings));
  }, [data]);

  const dirty = useMemo(
    () => Boolean(form && data && JSON.stringify(form) !== JSON.stringify(fromSettings(data.settings))),
    [form, data],
  );

  if (!form) {
    return (
      <div>
        <AdminHeader title="Settings" description="Shop details, delivery and payments." />
        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : <div className="h-96 animate-pulse rounded-2xl bg-white" />}
      </div>
    );
  }

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm({ ...form, [key]: value });
  const pinCount = form.servicePincodes.split(/[\s,]+/).filter((pin) => /^\d{6}$/.test(pin)).length;

  async function save() {
    if (!form) return;
    setBusy(true);
    const { privacy, terms, refund, shipping, ...rest } = form;
    const ok = await attempt(
      () => saveAdmin("/api/admin/settings", { ...rest, deliveryFee: form.deliveryFee || "0", policies: { privacy, terms, refund, shipping } }),
      "Settings saved",
    );
    setBusy(false);
    if (ok) await reload();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="pb-24"
    >
      <AdminHeader title="Settings" description="Shop details, delivery and payments. Customers see these across the site." />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <nav className="z-10 -mx-1 lg:sticky lg:top-0 mb-5 flex gap-1 overflow-x-auto bg-[#f6f4f0]/90 px-1 py-2 backdrop-blur">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-primary/40 hover:text-primary">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        <Panel id="store" title="Store" description="How your shop is named across the site." bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" value={form.name} onChange={set("name")} />
          <Field label="Tagline" value={form.tagline} onChange={set("tagline")} />
          <Field label="About the shop" area className="sm:col-span-2" value={form.about} onChange={set("about")} hint="Shown on the About page and in the footer." />
          <div className="sm:col-span-2">
            <Toggle
              checked={form.starterCatalogue}
              onChange={set("starterCatalogue")}
              label="Show the starter catalogue notice"
              description="Turn this off once your real products and prices are in."
            />
          </div>
        </Panel>

        <Panel id="contact" title="Contact" description="Shown in the header, footer and Contact page." bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
          <Field label="WhatsApp number" type="tel" value={form.whatsapp} onChange={set("whatsapp")} hint="Digits only with country code, e.g. 919876543210" />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field label="Opening hours" value={form.hours} onChange={set("hours")} placeholder="Every day, 7 AM – 9 PM" />
        </Panel>

        <Panel id="address" title="Address" description="Where your shop is." bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Shop address" className="sm:col-span-2" value={form.addressLine} onChange={set("addressLine")} />
          <Field label="Area" value={form.area} onChange={set("area")} />
          <Field label="City" value={form.city} onChange={set("city")} />
          <Field label="State" value={form.state} onChange={set("state")} />
          <Field label="Pincode" inputMode="numeric" value={form.pincode} onChange={set("pincode")} />
          <Field label="Google Maps link" className="sm:col-span-2" value={form.mapUrl} onChange={set("mapUrl")} />
        </Panel>

        <Panel id="delivery" title="Delivery" description="Where you deliver and what it costs." bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field
            label="Delivery pincodes"
            area
            className="sm:col-span-2"
            value={form.servicePincodes}
            onChange={set("servicePincodes")}
            hint={`${pinCount} pincode${pinCount === 1 ? "" : "s"}. Separate with commas or spaces.`}
          />
          <Field label="Delivery fee" prefix="₹" inputMode="decimal" value={form.deliveryFee} onChange={set("deliveryFee")} />
          <Field label="Free delivery above" prefix="₹" inputMode="decimal" value={form.freeDeliveryAbove} onChange={set("freeDeliveryAbove")} hint="Empty means delivery is never free." />
        </Panel>

        <Panel id="payments" title="Payments" description="How customers can pay." bodyClassName="space-y-3">
          <Toggle checked={form.codEnabled} onChange={set("codEnabled")} label="Cash on delivery" description="Customers pay the rider in cash or UPI." />
          <Toggle
            checked={form.onlinePaymentEnabled}
            onChange={set("onlinePaymentEnabled")}
            label="Online payment"
            description="Needs Razorpay keys in your hosting settings before it works."
          />
        </Panel>

        <Panel id="policies" title="Policies" description="The text on your legal pages. Leave a box empty to keep the current text." bodyClassName="grid gap-4">
          <Field label="Privacy policy" area value={form.privacy} onChange={set("privacy")} />
          <Field label="Terms of service" area value={form.terms} onChange={set("terms")} />
          <Field label="Refund policy" area value={form.refund} onChange={set("refund")} />
          <Field label="Delivery policy" area value={form.shipping} onChange={set("shipping")} />
        </Panel>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="text-sm text-muted-foreground">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
          <div className="flex gap-2">
            {dirty && (
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => data && setForm(fromSettings(data.settings))}>
                Discard
              </Button>
            )}
            <SubmitButton busy={busy}>Save settings</SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
