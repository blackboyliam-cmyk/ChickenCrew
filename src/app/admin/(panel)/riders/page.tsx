"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, Copy, MapPin, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LiveMap, type MapPoint } from "@/components/maps/live-map";
import { AdminHeader, Badge, EditorDialog, EmptyRow, ErrorBanner, Field, LoadingRows, Panel, Switch, attempt, saveAdmin, useAdmin } from "@/components/admin/forms";
import { placeUrl } from "@/lib/maps";
import { formatINR } from "@/lib/money";
import type { RiderLocation } from "@/lib/types";

type AdminRider = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  createdAt: string;
  openOrders: number;
  deliveredToday: number;
  cashInHand: number;
};

type Draft = { id?: string; name: string; phone: string; pin: string; active: boolean };

const FRESH_MS = 30 * 60 * 1000;

function lastSeen(location: RiderLocation | undefined) {
  if (!location) return null;
  const minutes = Math.round((Date.now() - new Date(location.at).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : "over a day ago";
}

export default function RidersAdmin() {
  const { data, error, reload } = useAdmin<{ riders: AdminRider[]; locations: Record<string, RiderLocation> }>("/api/admin/riders");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const riders = data?.riders ?? [];
  const locations = data?.locations;

  useEffect(() => {
    setOrigin(window.location.origin);
    const timer = setInterval(() => void reload(), 30000);
    return () => clearInterval(timer);
  }, [reload]);

  const points = useMemo<MapPoint[]>(() => {
    if (!data) return [];
    return data.riders.flatMap((rider) => {
      const location = locations?.[rider.id];
      if (!location || Date.now() - new Date(location.at).getTime() > FRESH_MS) return [];
      return [{ id: rider.id, lat: location.lat, lng: location.lng, kind: "rider" as const, title: rider.name }];
    });
  }, [data, locations]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = { name: draft.name, phone: draft.phone, pin: draft.pin, active: draft.active };
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/riders/${draft.id}` : "/api/admin/riders", body, draft.id ? "PUT" : "POST"),
      draft.id ? "Rider updated" : "Rider added",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  async function toggle(rider: AdminRider) {
    await attempt(
      () => saveAdmin(`/api/admin/riders/${rider.id}`, { name: rider.name, phone: rider.phone, active: !rider.active }, "PUT"),
      rider.active ? `${rider.name} can no longer sign in` : `${rider.name} is active`,
    );
    await reload();
  }

  async function settle(rider: AdminRider) {
    if (!window.confirm(`Mark ${formatINR(rider.cashInHand)} as received from ${rider.name}?`)) return;
    await attempt(() => saveAdmin(`/api/admin/riders/${rider.id}`, { action: "settle" }, "PUT"), `Cash from ${rider.name} settled`);
    await reload();
  }

  const appUrl = `${origin}/rider`;

  return (
    <div>
      <AdminHeader
        title="Riders"
        description="Delivery partners sign in on their phone with their mobile number and PIN, then see the orders you assign them."
        action={
          <Button className="h-10 rounded-xl font-bold" onClick={() => setDraft({ name: "", phone: "", pin: "", active: true })}>
            <Plus className="size-4" /> Add rider
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-card">
        <p className="text-sm">
          <span className="font-semibold">Rider app:</span> <span className="font-mono text-muted-foreground">{appUrl}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => {
            void navigator.clipboard?.writeText(appUrl);
            toast.success("Link copied. Send it to your riders.");
          }}
        >
          <Copy className="size-3.5" /> Copy link
        </Button>
      </div>

      {points.length > 0 && (
        <Panel title="Live map" description="Riders who shared their location in the last 30 minutes." className="mb-4" bodyClassName="p-3">
          <LiveMap
            className="h-80"
            points={points}
            fallback={
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Add a Google Maps key to see riders on a map. Use the map links in the list below for now.
              </p>
            }
          />
        </Panel>
      )}

      <Panel bodyClassName="p-0">
        {!data ? (
          <LoadingRows />
        ) : riders.length === 0 ? (
          <EmptyRow icon={Bike} title="No riders yet" body="Add your delivery partners, give them a PIN, and assign orders to them from the Orders page." />
        ) : (
          <ul className="divide-y">
            {riders.map((rider) => {
              const location = locations?.[rider.id];
              const seen = lastSeen(location);
              return (
                <li key={rider.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
                  <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">
                      {rider.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{rider.name}</span>
                        <Badge tone={rider.active ? "green" : "gray"}>{rider.active ? "Active" : "Off"}</Badge>
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <a href={`tel:+91${rider.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Phone className="size-3" /> {rider.phone}
                        </a>
                        {location && seen && (
                          <a href={placeUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                            <MapPin className="size-3" /> Seen {seen}
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                  <dl className="flex gap-5 text-center text-xs">
                    <div>
                      <dt className="text-muted-foreground">Assigned</dt>
                      <dd className="text-base font-bold tabular-nums">{rider.openOrders}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Delivered today</dt>
                      <dd className="text-base font-bold tabular-nums">{rider.deliveredToday}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cash to collect</dt>
                      <dd className="text-base font-bold tabular-nums">{formatINR(rider.cashInHand)}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center gap-2">
                    {rider.cashInHand > 0 && (
                      <Button size="sm" className="rounded-lg" onClick={() => void settle(rider)}>
                        Settle cash
                      </Button>
                    )}
                    <Switch checked={rider.active} onChange={() => void toggle(rider)} label={`${rider.name} can sign in`} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setDraft({ id: rider.id, name: rider.name, phone: rider.phone, pin: "", active: rider.active })}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <EditorDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? `Edit ${draft.name}` : "Add rider"}
        description="The rider signs in at /rider with this mobile number and PIN."
        onSubmit={() => void save()}
        busy={busy}
        submitLabel={draft?.id ? "Save changes" : "Add rider"}
      >
        {draft && (
          <>
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} placeholder="Ravi Kumar" />
            <Field
              label="Mobile number"
              prefix="+91"
              type="tel"
              inputMode="numeric"
              value={draft.phone}
              onChange={(phone) => setDraft({ ...draft, phone: phone.replace(/\D/g, "").slice(0, 10) })}
            />
            <Field
              label={draft.id ? "New PIN" : "PIN"}
              inputMode="numeric"
              value={draft.pin}
              onChange={(pin) => setDraft({ ...draft, pin: pin.replace(/\D/g, "").slice(0, 6) })}
              hint={draft.id ? "Leave empty to keep the current PIN." : "4 to 6 digits. Share it with the rider privately."}
            />
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span>
                <span className="block text-sm font-semibold">Can sign in</span>
                <span className="block text-xs text-muted-foreground">Turning this off also unassigns orders they haven&apos;t picked up.</span>
              </span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Can sign in" />
            </div>
          </>
        )}
      </EditorDialog>
    </div>
  );
}
