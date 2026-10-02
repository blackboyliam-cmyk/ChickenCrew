"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import type { Address } from "@/lib/types";

const EMPTY = { label: "home", name: "", phone: "", house: "", building: "", street: "", area: "", landmark: "", city: "", state: "", pincode: "" };

export default function AddressesPage() {
  const { user, ready } = useShop();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ addresses: Address[] }>("/api/addresses");
    setAddresses(data.addresses);
  }

  useEffect(() => {
    if (user) void load().catch(() => setError("Something went wrong."));
  }, [user]);

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) return <Button asChild><Link href="/login?next=/account/addresses">Log in</Link></Button>;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/addresses", { method: "POST", body: form });
      setForm({ ...EMPTY, phone: user?.phone || "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold">Addresses</h2>
      <ul className="mt-4 space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-2xl border bg-card p-4 text-sm">
            <p className="font-medium capitalize">{address.label}</p>
            <p className="mt-1 text-muted-foreground">
              {address.house}, {address.street}, {address.area}, {address.city}, {address.state} {address.pincode}
            </p>
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => api(`/api/addresses/${address.id}`, { method: "DELETE" }).then(load)}
            >
              Remove
            </button>
          </li>
        ))}
        {addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
      </ul>
      <form onSubmit={save} className="mt-6 grid gap-3 sm:grid-cols-2">
        {Object.keys(EMPTY).filter((key) => key !== "label").map((key) => (
          <Input
            key={key}
            aria-label={key}
            placeholder={key}
            value={form[key as keyof typeof form]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
        ))}
        <div className="flex gap-2 sm:col-span-2">
          {["home", "work", "other"].map((label) => (
            <button key={label} type="button" className={`h-11 rounded-xl border px-4 text-sm capitalize ${form.label === label ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setForm({ ...form, label })}>
              {label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
        <Button type="submit" className="sm:col-span-2">Save address</Button>
      </form>
    </div>
  );
}
