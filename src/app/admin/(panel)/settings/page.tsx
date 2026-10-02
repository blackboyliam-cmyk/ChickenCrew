"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { ShopSettings } from "@/lib/types";

export default function SettingsAdmin() {
  const { data, error, reload } = useAdmin<{ settings: ShopSettings }>("/api/admin/settings");
  const [form, setForm] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState({ cod: true, online: true, starter: true });

  useEffect(() => {
    if (!data) return;
    const settings = data.settings;
    setForm({
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      addressLine: settings.addressLine,
      area: settings.area,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      hours: settings.hours,
      mapUrl: settings.mapUrl,
      about: settings.about,
      servicePincodes: settings.servicePincodes.join(", "),
      deliveryFee: String(settings.deliveryFee / 100),
      freeDeliveryAbove: settings.freeDeliveryAbove == null ? "" : String(settings.freeDeliveryAbove / 100),
    });
    setFlags({ cod: settings.codEnabled, online: settings.onlinePaymentEnabled, starter: settings.starterCatalogue });
  }, [data]);

  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void saveAdmin("/api/admin/settings", {
          ...form,
          deliveryFee: Number(form.deliveryFee || 0),
          freeDeliveryAbove: form.freeDeliveryAbove,
          codEnabled: flags.cod,
          onlinePaymentEnabled: flags.online,
          starterCatalogue: flags.starter,
        }).then(reload);
      }}
    >
      <h1 className="text-2xl font-semibold">Shop settings</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Field label="Phone" value={form.phone || ""} onChange={(phone) => setForm({ ...form, phone })} />
      <Field label="WhatsApp" value={form.whatsapp || ""} onChange={(whatsapp) => setForm({ ...form, whatsapp })} />
      <Field label="Email" value={form.email || ""} onChange={(email) => setForm({ ...form, email })} />
      <Field label="Address" value={form.addressLine || ""} onChange={(addressLine) => setForm({ ...form, addressLine })} />
      <Field label="Area" value={form.area || ""} onChange={(area) => setForm({ ...form, area })} />
      <Field label="City" value={form.city || ""} onChange={(city) => setForm({ ...form, city })} />
      <Field label="State" value={form.state || ""} onChange={(state) => setForm({ ...form, state })} />
      <Field label="Shop pincode" value={form.pincode || ""} onChange={(pincode) => setForm({ ...form, pincode })} />
      <Field label="Hours" value={form.hours || ""} onChange={(hours) => setForm({ ...form, hours })} />
      <Field label="Map URL" value={form.mapUrl || ""} onChange={(mapUrl) => setForm({ ...form, mapUrl })} />
      <Field label="Delivery pincodes" value={form.servicePincodes || ""} onChange={(servicePincodes) => setForm({ ...form, servicePincodes })} />
      <Field label="Delivery fee" value={form.deliveryFee || ""} onChange={(deliveryFee) => setForm({ ...form, deliveryFee })} />
      <Field label="Free delivery above" value={form.freeDeliveryAbove || ""} onChange={(freeDeliveryAbove) => setForm({ ...form, freeDeliveryAbove })} />
      <Field label="About" value={form.about || ""} onChange={(about) => setForm({ ...form, about })} area />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.cod} onChange={(event) => setFlags({ ...flags, cod: event.target.checked })} /> Cash on delivery</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.online} onChange={(event) => setFlags({ ...flags, online: event.target.checked })} /> Online payment switch</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags.starter} onChange={(event) => setFlags({ ...flags, starter: event.target.checked })} /> Starter catalogue banner</label>
      <Button type="submit">Save settings</Button>
    </form>
  );
}
