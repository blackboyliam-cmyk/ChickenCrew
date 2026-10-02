"use client";

import { useState } from "react";
import { Copy, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AdminHeader,
  Badge,
  EditorDialog,
  EmptyRow,
  ErrorBanner,
  Field,
  LoadingRows,
  Panel,
  Switch,
  attempt,
  saveAdmin,
  toRupees,
  useAdmin,
} from "@/components/admin/forms";
import { formatINR } from "@/lib/money";
import type { Coupon } from "@/lib/types";

type Draft = {
  id?: string;
  code: string;
  type: "flat" | "percent";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  phones: string;
  expiry: string;
  active: boolean;
};

const kolkataDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));

const toBody = (d: Draft) => ({
  code: d.code,
  type: d.type,
  value: d.value,
  minOrder: d.minOrder,
  maxDiscount: d.type === "percent" ? d.maxDiscount : "",
  maxUses: d.maxUses,
  phones: d.phones,
  expiresAt: d.expiry ? `${d.expiry}T23:59:00+05:30` : "",
  active: d.active,
});

const fromCoupon = (c: Coupon): Draft => ({
  id: c.id,
  code: c.code,
  type: c.type,
  value: c.type === "percent" ? String(c.value) : toRupees(c.value),
  minOrder: c.minOrder ? toRupees(c.minOrder) : "",
  maxDiscount: toRupees(c.maxDiscount),
  maxUses: c.maxUses == null ? "" : String(c.maxUses),
  phones: c.phones.join(", "),
  expiry: c.expiresAt ? kolkataDate(c.expiresAt) : "",
  active: c.active,
});

function summary(c: Coupon) {
  const off = c.type === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`;
  const cap = c.type === "percent" && c.maxDiscount ? ` up to ${formatINR(c.maxDiscount)}` : "";
  const min = c.minOrder ? ` on orders above ${formatINR(c.minOrder)}` : "";
  return off + cap + min;
}

function couponState(c: Coupon): { label: string; tone: "green" | "gray" | "red" | "amber" } {
  if (!c.active) return { label: "Off", tone: "gray" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: "Expired", tone: "red" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: "Used up", tone: "amber" };
  return { label: "Live", tone: "green" };
}

export default function CouponsAdmin() {
  const { data, error, reload } = useAdmin<{ coupons: Coupon[] }>("/api/admin/coupons");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const coupons = data?.coupons ?? [];

  async function save() {
    if (!draft) return;
    setBusy(true);
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/coupons/${draft.id}` : "/api/admin/coupons", toBody(draft), draft.id ? "PUT" : "POST"),
      draft.id ? "Coupon updated" : "Coupon created",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  async function toggle(coupon: Coupon) {
    await attempt(
      () => saveAdmin(`/api/admin/coupons/${coupon.id}`, toBody({ ...fromCoupon(coupon), active: !coupon.active }), "PUT"),
      coupon.active ? `${coupon.code} turned off` : `${coupon.code} is live`,
    );
    await reload();
  }

  return (
    <div>
      <AdminHeader
        title="Coupons"
        description="Discount codes customers enter at checkout."
        action={
          <Button
            className="h-10 rounded-xl font-bold"
            onClick={() =>
              setDraft({ code: "", type: "flat", value: "", minOrder: "", maxDiscount: "", maxUses: "", phones: "", expiry: "", active: true })
            }
          >
            <Plus className="size-4" /> New coupon
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <Panel bodyClassName="p-0">
        {!data ? (
          <LoadingRows />
        ) : coupons.length === 0 ? (
          <EmptyRow icon={TicketPercent} title="No coupons yet" body="Create a code like WELCOME50 for first orders." />
        ) : (
          <ul className="divide-y">
            {coupons.map((coupon) => {
              const state = couponState(coupon);
              return (
                <li key={coupon.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(coupon.code);
                      toast.success(`Copied ${coupon.code}`);
                    }}
                    className="group inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-primary"
                    title="Copy code"
                  >
                    {coupon.code}
                    <Copy className="size-3.5 opacity-50 group-hover:opacity-100" />
                  </button>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-sm font-semibold">{summary(coupon)}</p>
                    <p className="text-xs text-muted-foreground">
                      Used {coupon.usedCount}
                      {coupon.maxUses != null ? ` of ${coupon.maxUses}` : ""} times
                      {coupon.expiresAt ? ` · ends ${new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      {coupon.phones.length ? ` · ${coupon.phones.length} customer${coupon.phones.length === 1 ? "" : "s"} only` : ""}
                    </p>
                  </div>
                  <Badge tone={state.tone}>{state.label}</Badge>
                  <Switch checked={coupon.active} onChange={() => void toggle(coupon)} label={`Turn ${coupon.code} on or off`} />
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDraft(fromCoupon(coupon))}>
                    Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <EditorDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? `Edit ${draft.code}` : "New coupon"}
        onSubmit={() => void save()}
        busy={busy}
        submitLabel={draft?.id ? "Save changes" : "Create coupon"}
      >
        {draft && (
          <>
            <Field
              label="Code"
              value={draft.code}
              onChange={(code) => setDraft({ ...draft, code: code.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              placeholder="WELCOME50"
              hint="3–20 letters or numbers."
            />
            <div>
              <p className="mb-1.5 text-sm font-semibold">Discount type</p>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                {(["flat", "percent"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraft({ ...draft, type })}
                    className={cn(
                      "h-9 rounded-lg text-sm font-semibold transition",
                      draft.type === type ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {type === "flat" ? "Flat ₹ off" : "Percent off"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={draft.type === "flat" ? "Amount off" : "Percent off"}
                prefix={draft.type === "flat" ? "₹" : "%"}
                inputMode="decimal"
                value={draft.value}
                onChange={(value) => setDraft({ ...draft, value })}
              />
              <Field label="Minimum order" prefix="₹" inputMode="decimal" value={draft.minOrder} onChange={(minOrder) => setDraft({ ...draft, minOrder })} hint="Optional" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {draft.type === "percent" && (
                <Field
                  label="Maximum discount"
                  prefix="₹"
                  inputMode="decimal"
                  value={draft.maxDiscount}
                  onChange={(maxDiscount) => setDraft({ ...draft, maxDiscount })}
                  hint="Optional cap"
                />
              )}
              <Field label="Total uses allowed" inputMode="numeric" value={draft.maxUses} onChange={(maxUses) => setDraft({ ...draft, maxUses })} hint="Empty means unlimited" />
              <Field label="Last day" type="date" value={draft.expiry} onChange={(expiry) => setDraft({ ...draft, expiry })} hint="Empty means no end date" />
            </div>
            <Field
              label="Only for these phone numbers"
              value={draft.phones}
              onChange={(phones) => setDraft({ ...draft, phones })}
              hint="Optional. Separate numbers with commas."
            />
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-sm font-semibold">Coupon is on</span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Coupon is on" />
            </div>
          </>
        )}
      </EditorDialog>
    </div>
  );
}
