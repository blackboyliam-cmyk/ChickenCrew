"use client";

import { useState } from "react";
import { Clock, Plus } from "lucide-react";
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
  useAdmin,
} from "@/components/admin/forms";
import type { SlotTemplate } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Draft = { id?: string; start: string; end: string; capacity: string; cutoffMinutes: string; days: number[]; active: boolean };

const toBody = (d: Draft) => ({
  start: d.start,
  end: d.end,
  capacity: d.capacity,
  cutoffMinutes: d.cutoffMinutes,
  days: d.days,
  active: d.active,
});

const fromSlot = (s: SlotTemplate): Draft => ({
  id: s.id,
  start: s.start,
  end: s.end,
  capacity: String(s.capacity),
  cutoffMinutes: String(s.cutoffMinutes),
  days: s.days,
  active: s.active,
});

const dayText = (days: number[]) =>
  days.length === 0 || days.length === 7 ? "Every day" : days.slice().sort().map((day) => DAYS[day]).join(", ");

export default function SlotsAdmin() {
  const { data, error, reload } = useAdmin<{ slots: SlotTemplate[] }>("/api/admin/slots");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const slots = (data?.slots ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));

  async function save() {
    if (!draft) return;
    setBusy(true);
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/slots/${draft.id}` : "/api/admin/slots", toBody(draft), draft.id ? "PUT" : "POST"),
      draft.id ? "Slot updated" : "Slot added",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  async function toggle(slot: SlotTemplate) {
    await attempt(
      () => saveAdmin(`/api/admin/slots/${slot.id}`, toBody({ ...fromSlot(slot), active: !slot.active }), "PUT"),
      slot.active ? `${slot.label} paused` : `${slot.label} is open`,
    );
    await reload();
  }

  return (
    <div>
      <AdminHeader
        title="Delivery slots"
        description="Time windows customers can pick at checkout."
        action={
          <Button
            className="h-10 rounded-xl font-bold"
            onClick={() => setDraft({ start: "18:00", end: "20:00", capacity: "10", cutoffMinutes: "60", days: [], active: true })}
          >
            <Plus className="size-4" /> Add slot
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <Panel bodyClassName="p-0">
        {!data ? (
          <LoadingRows />
        ) : slots.length === 0 ? (
          <EmptyRow icon={Clock} title="No delivery slots" body="Customers can't check out until at least one slot is on." />
        ) : (
          <ul className="divide-y">
            {slots.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", slot.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  <Clock className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex items-center gap-2 font-semibold">
                    {slot.label}
                    {!slot.active && <Badge>Paused</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayText(slot.days)} · {slot.capacity} orders max · closes {slot.cutoffMinutes} min before
                  </p>
                </div>
                <Switch checked={slot.active} onChange={() => void toggle(slot)} label={`Open ${slot.label}`} />
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDraft(fromSlot(slot))}>
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <EditorDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit slot" : "New slot"}
        onSubmit={() => void save()}
        busy={busy}
        submitLabel={draft?.id ? "Save changes" : "Add slot"}
      >
        {draft && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts" type="time" value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
              <Field label="Ends" type="time" value={draft.end} onChange={(end) => setDraft({ ...draft, end })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Orders per slot" inputMode="numeric" value={draft.capacity} onChange={(capacity) => setDraft({ ...draft, capacity })} />
              <Field
                label="Stop orders before"
                inputMode="numeric"
                value={draft.cutoffMinutes}
                onChange={(cutoffMinutes) => setDraft({ ...draft, cutoffMinutes })}
                hint="Minutes before the start"
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Days</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((name, day) => {
                  const on = draft.days.includes(day);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((d) => d !== day) : [...draft.days, day] })}
                      className={cn(
                        "h-9 w-12 rounded-lg border text-sm font-semibold transition",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:border-primary/50",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {draft.days.length === 0 ? "No days picked, so it runs every day." : `Runs on ${dayText(draft.days)}.`}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-sm font-semibold">Slot is open</span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Slot is open" />
            </div>
          </>
        )}
      </EditorDialog>
    </div>
  );
}
