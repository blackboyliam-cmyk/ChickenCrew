"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export default function AdminHome() {
  const [counts, setCounts] = useState({ products: 0, orders: 0, customers: 0 });
  const [starter, setStarter] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ products: unknown[] }>("/api/admin/products"),
      api<{ orders: unknown[] }>("/api/admin/orders"),
      api<{ customers: unknown[] }>("/api/admin/customers"),
      api<{ settings: { starterCatalogue: boolean } }>("/api/admin/settings"),
    ]).then(([products, orders, customers, settings]) => {
      setCounts({ products: products.products.length, orders: orders.orders.length, customers: customers.customers.length });
      setStarter(settings.settings.starterCatalogue);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      {starter && (
        <p className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-sm">
          Starter prices and stock are placeholders. Update them, add your delivery pincodes, and turn off “Starter catalogue” before taking real orders.
        </p>
      )}
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Products", counts.products],
          ["Orders", counts.orders],
          ["Customers", counts.customers],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
