"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/site/states";
import { api } from "@/lib/api-client";

type Coupon = { code: string; description: string };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<{ coupons: Coupon[] }>("/api/coupons")
      .then((data) => setCoupons(data.coupons))
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm">Something went wrong. Please try again.</p>;
  if (!coupons) return <p className="text-sm text-muted-foreground">Loading coupons…</p>;
  if (coupons.length === 0) {
    return <EmptyState title="No coupons" body="The shop has not published a coupon you can use." />;
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">Coupons</h2>
      <ul className="mt-4 space-y-3">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="rounded-2xl border bg-card p-4">
            <p className="font-semibold">{coupon.code}</p>
            <p className="mt-1 text-sm text-muted-foreground">{coupon.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
