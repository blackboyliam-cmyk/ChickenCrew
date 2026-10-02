"use client";

import { useMemo, useState } from "react";
import { Phone, Users } from "lucide-react";
import { AdminHeader, Badge, EmptyRow, ErrorBanner, LoadingRows, Panel, SearchInput, useAdmin } from "@/components/admin/forms";

type Customer = { id: string; name: string; phone: string; email: string; orders: number; createdAt: string };

const joined = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") : "?";
}

export default function CustomersAdmin() {
  const { data, error, reload } = useAdmin<{ customers: Customer[] }>("/api/admin/customers");
  const [query, setQuery] = useState("");

  const customers = useMemo(() => {
    const list = (data?.customers ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
  }, [data, query]);

  const all = data?.customers ?? [];
  const repeat = all.filter((c) => c.orders > 1).length;

  return (
    <div>
      <AdminHeader title="Customers" description="Everyone who has signed in with their phone number." />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["Total", all.length],
          ["Ordered", all.filter((c) => c.orders > 0).length],
          ["Repeat", repeat],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white px-4 py-3 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{data ? value : "–"}</p>
          </div>
        ))}
      </div>

      <Panel
        bodyClassName="p-0"
        title="All customers"
        action={<SearchInput value={query} onChange={setQuery} placeholder="Name, phone or email" />}
      >
        {!data ? (
          <LoadingRows />
        ) : customers.length === 0 ? (
          <EmptyRow
            icon={Users}
            title={query ? "No matches" : "No customers yet"}
            body={query ? "Try a different name or number." : "Customers appear here after they sign in."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{c.name || "No name yet"}</p>
                          {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <a href={`tel:+91${c.phone}`} className="inline-flex items-center gap-1.5 font-medium hover:text-primary">
                        <Phone className="size-3.5 text-muted-foreground" />
                        {c.phone}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      {c.orders === 0 ? <Badge>None</Badge> : <Badge tone={c.orders > 1 ? "green" : "blue"}>{c.orders}</Badge>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{joined(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
