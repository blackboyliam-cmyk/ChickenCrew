"use client";

import { useAdmin } from "@/components/admin/forms";

type Customer = { id: string; name: string; phone: string; email: string; orders: number };

export default function CustomersAdmin() {
  const { data, error } = useAdmin<{ customers: Customer[] }>("/api/admin/customers");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Customers</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="mt-4 space-y-2 text-sm">
        {data?.customers.map((customer) => (
          <li key={customer.id} className="rounded-xl border px-3 py-2">
            {customer.name || "No name"} · {customer.phone} · {customer.orders} orders
          </li>
        ))}
        {data && data.customers.length === 0 && <p className="text-muted-foreground">No customers yet.</p>}
      </ul>
    </div>
  );
}
