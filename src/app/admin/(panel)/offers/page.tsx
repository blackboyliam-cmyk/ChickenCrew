"use client";

import { useState } from "react";
import { ImageOff, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminHeader,
  Badge,
  EditorDialog,
  EmptyRow,
  ErrorBanner,
  Field,
  Panel,
  Switch,
  attempt,
  saveAdmin,
  toRupees,
  useAdmin,
} from "@/components/admin/forms";
import { formatINR } from "@/lib/money";
import type { Offer } from "@/lib/types";

type Draft = { id?: string; title: string; description: string; href: string; price: string; mrp: string; image: string; sort: string; active: boolean };

const toBody = (d: Draft) => ({
  title: d.title,
  description: d.description,
  href: d.href,
  price: d.price,
  mrp: d.mrp,
  image: d.image,
  imageAlt: d.title,
  sort: Number(d.sort) || 0,
  active: d.active,
});

const fromOffer = (o: Offer): Draft => ({
  id: o.id,
  title: o.title,
  description: o.description,
  href: o.href,
  price: toRupees(o.price),
  mrp: toRupees(o.mrp),
  image: o.image,
  sort: String(o.sort),
  active: o.active,
});

export default function OffersAdmin() {
  const { data, error, reload } = useAdmin<{ offers: Offer[] }>("/api/admin/offers");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const offers = (data?.offers ?? []).slice().sort((a, b) => a.sort - b.sort);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/offers/${draft.id}` : "/api/admin/offers", toBody(draft), draft.id ? "PUT" : "POST"),
      draft.id ? "Offer updated" : "Offer added",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  async function toggle(offer: Offer) {
    await attempt(
      () => saveAdmin(`/api/admin/offers/${offer.id}`, toBody({ ...fromOffer(offer), active: !offer.active }), "PUT"),
      offer.active ? "Offer paused" : "Offer is live",
    );
    await reload();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this offer?")) return;
    const ok = await attempt(() => saveAdmin(`/api/admin/offers/${id}`, {}, "DELETE"), "Offer deleted");
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  return (
    <div>
      <AdminHeader
        title="Offers"
        description="Deal cards on the homepage and the Offers page."
        action={
          <Button
            className="h-10 rounded-xl font-bold"
            onClick={() =>
              setDraft({ title: "", description: "", href: "/shop", price: "", mrp: "", image: "/media/curry.jpg", sort: String(offers.length + 1), active: true })
            }
          >
            <Plus className="size-4" /> Add offer
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      {!data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Panel>
          <EmptyRow icon={Tag} title="No offers yet" body="Create a deal to feature it on the homepage." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.id} className="flex overflow-hidden rounded-2xl border bg-white shadow-card">
              <span className="grid w-32 shrink-0 place-items-center bg-muted">
                {offer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offer.image} alt="" className="size-full object-cover" />
                ) : (
                  <ImageOff className="size-5 text-muted-foreground" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-snug">{offer.title}</p>
                  <Switch checked={offer.active} onChange={() => void toggle(offer)} label={`Show ${offer.title}`} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    {offer.price != null && <span className="font-bold">{formatINR(offer.price)}</span>}
                    {offer.mrp != null && offer.price != null && offer.mrp > offer.price && (
                      <span className="text-xs text-muted-foreground line-through">{formatINR(offer.mrp)}</span>
                    )}
                    {!offer.active && <Badge>Paused</Badge>}
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDraft(fromOffer(offer))}>
                    Edit
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <EditorDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit offer" : "New offer"}
        onSubmit={() => void save()}
        busy={busy}
        submitLabel={draft?.id ? "Save changes" : "Add offer"}
        footerStart={
          draft?.id ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void remove(draft.id!)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : undefined
        }
      >
        {draft && (
          <>
            <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Weekend curry cut deal" />
            <Field label="Description" area value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Offer price" prefix="₹" inputMode="decimal" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} hint="Optional" />
              <Field label="MRP" prefix="₹" inputMode="decimal" value={draft.mrp} onChange={(mrp) => setDraft({ ...draft, mrp })} hint="Optional" />
            </div>
            <Field label="Links to" value={draft.href} onChange={(href) => setDraft({ ...draft, href })} hint="A page on your shop, e.g. /product/curry-cut" />
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
              <Field label="Order" inputMode="numeric" value={draft.sort} onChange={(sort) => setDraft({ ...draft, sort })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-sm font-semibold">Show this offer</span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Show this offer" />
            </div>
          </>
        )}
      </EditorDialog>
    </div>
  );
}
