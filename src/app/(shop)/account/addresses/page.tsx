"use client";

import { useEffect, useId, useState } from "react";
import { Briefcase, Home, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import type { Address, AddressLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

type Form = Omit<Address, "id" | "userId">;

const EMPTY: Form = { label: "home", name: "", phone: "", house: "", building: "", street: "", area: "", landmark: "", city: "", state: "", pincode: "" };
const LABEL_ICON = { home: Home, work: Briefcase, other: MapPin } as const;

export default function AddressesPage() {
  const { user, ready } = useShop();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; form: Form } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setFailed(false);
    try {
      const data = await api<{ addresses: Address[] }>("/api/addresses");
      setAddresses(data.addresses);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    if (user) void load();
  }, [user]);

  if (!ready) return <ListSkeleton rows={2} />;
  if (!user) {
    return (
      <EmptyState
        icon={MapPin}
        title="Sign in to manage addresses"
        body="Save your home or work address for faster checkout."
        actionLabel="Sign in"
        href="/login?next=/account/addresses"
      />
    );
  }

  function open(address?: Address) {
    setError("");
    setEditing(
      address
        ? { id: address.id, form: { ...EMPTY, ...address } }
        : { form: { ...EMPTY, name: user?.name || "", phone: user?.phone || "" } },
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api(editing.id ? `/api/addresses/${editing.id}` : "/api/addresses", { method: editing.id ? "PUT" : "POST", body: editing.form });
      toast.success(editing.id ? "Address updated" : "Address saved");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(address: Address) {
    if (!window.confirm(`Remove your ${address.label} address?`)) return;
    try {
      await api(`/api/addresses/${address.id}`, { method: "DELETE" });
      toast.success("Address removed");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  const form = editing?.form;
  const set = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Addresses</h2>
        {addresses && addresses.length > 0 && (
          <Button variant="outline" className="h-10 rounded-xl font-semibold" onClick={() => open()}>
            <Plus className="size-4" /> Add address
          </Button>
        )}
      </div>

      <div className="mt-4">
        {failed ? (
          <ErrorState onRetry={() => void load()} />
        ) : addresses === null ? (
          <ListSkeleton rows={2} />
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="size-6" />
            </span>
            <p className="mt-4 text-lg font-bold">No saved addresses</p>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Add one now and checkout will fill it in for you.</p>
            <Button className="mt-6 h-11 rounded-xl px-6 font-semibold" onClick={() => open()}>
              <Plus className="size-4" /> Add address
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => {
              const Icon = LABEL_ICON[address.label];
              return (
                <li key={address.id} className="flex flex-col rounded-2xl border bg-card p-4 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide">{address.label}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    {address.name} · {address.phone}
                  </p>
                  <p className="mt-0.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {[address.house, address.building, address.street, address.area, address.landmark].filter(Boolean).join(", ")}
                    <br />
                    {[address.city, address.state].filter(Boolean).join(", ")} {address.pincode}
                  </p>
                  <div className="mt-3 flex gap-1 border-t pt-3">
                    <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => open(address)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-destructive" onClick={() => void remove(address)}>
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {form && (
            <form onSubmit={save}>
              <DialogHeader className="border-b px-6 py-5 text-left">
                <DialogTitle className="text-lg font-extrabold">{editing?.id ? "Edit address" : "Add a new address"}</DialogTitle>
                <DialogDescription>We deliver to the pincodes the shop serves.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 px-6 py-5">
                <div className="flex gap-2">
                  {(["home", "work", "other"] as AddressLabel[]).map((label) => {
                    const Icon = LABEL_ICON[label];
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={form.label === label}
                        onClick={() => set({ label })}
                        className={cn(
                          "flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium capitalize transition-colors",
                          form.label === label ? "border-primary bg-primary/[0.06] text-primary" : "hover:border-foreground/30",
                        )}
                      >
                        <Icon className="size-4" /> {label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" autoComplete="name" value={form.name} onChange={(name) => set({ name })} />
                  <Field label="Mobile number" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(phone) => set({ phone })} />
                  <Field label="House / flat no." value={form.house} onChange={(house) => set({ house })} />
                  <Field label="Building (optional)" value={form.building} onChange={(building) => set({ building })} />
                  <Field label="Street (optional)" autoComplete="address-line1" value={form.street} onChange={(street) => set({ street })} className="sm:col-span-2" />
                  <Field label="Area" autoComplete="address-level3" value={form.area} onChange={(area) => set({ area })} />
                  <Field label="Landmark (optional)" value={form.landmark} onChange={(landmark) => set({ landmark })} />
                  <Field label="City" autoComplete="address-level2" value={form.city} onChange={(city) => set({ city })} />
                  <Field label="State (optional)" autoComplete="address-level1" value={form.state} onChange={(state) => set({ state })} />
                  <Field
                    label="Pincode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={(pincode) => set({ pincode: pincode.replace(/\D/g, "").slice(0, 6) })}
                  />
                </div>
                {error && (
                  <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="h-11 rounded-xl px-5 font-bold">
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {editing?.id ? "Save changes" : "Save address"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <Input id={id} value={value} autoComplete={autoComplete} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11" />
    </div>
  );
}
