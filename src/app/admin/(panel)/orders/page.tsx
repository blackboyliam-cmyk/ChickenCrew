"use client";

import { useAdmin, saveAdmin } from "@/components/admin/forms";
import { formatINR } from "@/lib/money";

type Row = { id: string; number: string; status: string; total: number; paymentStatus: string; createdAt: string };

const STATUSES = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled", "pending_payment"];

export default function OrdersAdmin() {
  const { data, reload, error } = useAdmin<{ orders: Row[] }>("/api/admin/orders");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="mt-4 space-y-3">
        {data?.orders.map((order) => (
          <li key={order.id} className="rounded-2xl border bg-card p-3 text-sm">
            <p className="font-medium">#{order.number} · {formatINR(order.total)} · {order.paymentStatus}</p>
            <label className="mt-2 block">
              Status
              <select
                className="mt-1 h-11 w-full rounded-lg border px-3"
                value={order.status}
                onChange={(event) => saveAdmin(`/api/admin/orders/${order.id}`, { status: event.target.value }, "PUT").then(reload)}
              >
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </li>
        ))}
        {data && data.orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </ul>
    </div>
  );
}
