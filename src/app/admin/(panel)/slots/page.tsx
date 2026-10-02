"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { SlotTemplate } from "@/lib/types";

export default function SlotsAdmin() {
  const { data, reload } = useAdmin<{ slots: SlotTemplate[] }>("/api/admin/slots");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [capacity, setCapacity] = useState("25");
  const [cutoff, setCutoff] = useState("90");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Delivery slots</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {data?.slots.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span>{slot.label} · capacity {slot.capacity} · {slot.active ? "open" : "disabled"}</span>
            <button type="button" className="underline" onClick={() => saveAdmin(`/api/admin/slots/${slot.id}`, { ...slot, active: !slot.active }, "PUT").then(reload)}>
              {slot.active ? "Disable" : "Enable"}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid max-w-md gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveAdmin("/api/admin/slots", { start, end, capacity: Number(capacity), cutoffMinutes: Number(cutoff), active: true, days: [] }).then(reload);
        }}
      >
        <Field label="Start" value={start} onChange={setStart} />
        <Field label="End" value={end} onChange={setEnd} />
        <Field label="Capacity" value={capacity} onChange={setCapacity} />
        <Field label="Cutoff minutes" value={cutoff} onChange={setCutoff} />
        <Button type="submit">Add slot</Button>
      </form>
    </div>
  );
}
