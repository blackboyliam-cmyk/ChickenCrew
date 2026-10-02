"use client";

import { useState } from "react";
import { ImageOff, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { Category, Product } from "@/lib/types";

type Draft = { id?: string; name: string; slug: string; image: string; sort: string; active: boolean };

const toBody = (draft: Draft) => ({
  name: draft.name,
  slug: draft.slug,
  image: draft.image,
  imageAlt: draft.name,
  sort: Number(draft.sort) || 0,
  active: draft.active,
});

const fromCategory = (c: Category): Draft => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, sort: String(c.sort), active: c.active });

export default function CategoriesAdmin() {
  const { data, error, reload } = useAdmin<{ categories: Category[] }>("/api/admin/categories");
  const products = useAdmin<{ products: Product[] }>("/api/admin/products");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = (data?.categories ?? []).slice().sort((a, b) => a.sort - b.sort);
  const count = (id: string) => products.data?.products.filter((p) => p.categoryId === id).length ?? 0;

  async function save() {
    if (!draft) return;
    setBusy(true);
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/categories/${draft.id}` : "/api/admin/categories", toBody(draft), draft.id ? "PUT" : "POST"),
      draft.id ? "Category updated" : "Category added",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await reload();
    }
  }

  async function toggle(category: Category) {
    await attempt(
      () => saveAdmin(`/api/admin/categories/${category.id}`, toBody({ ...fromCategory(category), active: !category.active }), "PUT"),
      category.active ? `${category.name} is hidden` : `${category.name} is visible`,
    );
    await reload();
  }

  return (
    <div>
      <AdminHeader
        title="Categories"
        description="The cuts customers browse by. Lower order numbers appear first."
        action={
          <Button
            className="h-10 rounded-xl font-bold"
            onClick={() => setDraft({ name: "", slug: "", image: "", sort: String(categories.length + 1), active: true })}
          >
            <Plus className="size-4" /> Add category
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      <Panel bodyClassName="p-0">
        {!data ? (
          <LoadingRows />
        ) : categories.length === 0 ? (
          <EmptyRow icon={LayoutGrid} title="No categories yet" body="Add a category such as Curry Cut or Boneless." />
        ) : (
          <ul className="divide-y">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {category.name}
                    {!category.active && <Badge>Hidden</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    /category/{category.slug} · {count(category.id)} product{count(category.id) === 1 ? "" : "s"} · order {category.sort}
                  </p>
                </div>
                <Switch checked={category.active} onChange={() => void toggle(category)} label={`Show ${category.name}`} />
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDraft(fromCategory(category))}>
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
        title={draft?.id ? "Edit category" : "New category"}
        onSubmit={() => void save()}
        busy={busy}
        submitLabel={draft?.id ? "Save changes" : "Add category"}
      >
        {draft && (
          <>
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} placeholder="Curry Cut" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="URL slug" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug })} hint="Leave empty to use the name." />
              <Field label="Display order" inputMode="numeric" value={draft.sort} onChange={(sort) => setDraft({ ...draft, sort })} />
            </div>
            <Field label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} hint="Optional. Line-art icons are used when empty." />
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-sm font-semibold">Show in the shop</span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Show in the shop" />
            </div>
          </>
        )}
      </EditorDialog>
    </div>
  );
}
