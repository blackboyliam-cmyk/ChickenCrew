"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { Coupon } from "@/lib/types";

export default function CouponsAdmin() {
  const { data, reload } = useAdmin<{ coupons: Coupon[] }>("/api/admin/coupons");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("50");
  const [minOrder, setMinOrder] = useState("499");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Coupons</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {data?.coupons.map((coupon) => (
          <li key={coupon.id} className="rounded-xl border px-3 py-2">
            {coupon.code} · {coupon.active ? "active" : "off"} · used {coupon.usedCount}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid max-w-md gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveAdmin("/api/admin/coupons", { code, type: "flat", value: Number(value), minOrder: Number(minOrder) }).then(reload);
        }}
      >
        <Field label="Code" value={code} onChange={setCode} />
        <Field label="Rupees off" value={value} onChange={setValue} />
        <Field label="Minimum order" value={minOrder} onChange={setMinOrder} />
        <Button type="submit">Add coupon</Button>
      </form>
    </div>
  );
}
