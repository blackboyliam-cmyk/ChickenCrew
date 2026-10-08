"use client";

import { useMemo, useState } from "react";
import { ImageOff, Package, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AdminHeader,
  Badge,
  EmptyRow,
  ErrorBanner,
  Field,
  LoadingRows,
  Panel,
  SearchInput,
  SelectField,
  SubmitButton,
  Switch,
  Toggle,
  attempt,
  saveAdmin,
  toRupees,
  useAdmin,
} from "@/components/admin/forms";
import { formatINR } from "@/lib/money";
import type { Category, Product } from "@/lib/types";
import { parseGrams } from "@/lib/weights";

type VariantDraft = { id?: string; label: string; sku: string; price: string; mrp: string; stock: string; active: boolean; maxQty: string };

type Draft = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  details: string;
  storage: string;
  preparation: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  active: boolean;
  perKg: string;
  variants: VariantDraft[];
};

function priceFor(perKg: string, label: string): string | null {
  const rate = Number(perKg);
  const grams = parseGrams(label);
  if (!perKg.trim() || !Number.isFinite(rate) || rate <= 0 || !grams) return null;
  return String(Math.round((rate * grams) / 1000));
}

function perKgOf(product: Product): string {
  for (const variant of product.variants) {
    const grams = parseGrams(variant.label);
    if (grams) return String(Math.round((variant.price / 100) * (1000 / grams)));
  }
  return "";
}

const blankVariant = (label = "500g"): VariantDraft => ({ label, sku: "", price: "", mrp: "", stock: "0", active: true, maxQty: "10" });

const blank: Draft = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  details: "",
  storage: "Refrigerate as soon as it arrives. Cook the same day.",
  preparation: "Cook until the meat is fully done.",
  image: "",
  imageAlt: "",
  featured: false,
  active: true,
  perKg: "",
  variants: [blankVariant()],
};

function toDraft(product: Product): Draft {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    details: product.details,
    storage: product.storage,
    preparation: product.preparation,
    image: product.images[0]?.url || "",
    imageAlt: product.images[0]?.alt || "",
    featured: product.featured,
    active: product.active,
    perKg: perKgOf(product),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      sku: variant.sku,
      price: toRupees(variant.price),
      mrp: toRupees(variant.mrp),
      stock: String(variant.stock),
      active: variant.active,
      maxQty: String(variant.maxQty),
    })),
  };
}

function toBody(draft: Draft) {
  return {
    name: draft.name,
    slug: draft.slug,
    categoryId: draft.categoryId,
    description: draft.description,
    details: draft.details,
    storage: draft.storage,
    preparation: draft.preparation,
    featured: draft.featured,
    active: draft.active,
    images: draft.image ? [{ url: draft.image, alt: draft.imageAlt || draft.name }] : [],
    variants: draft.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      sku: variant.sku,
      price: Number(variant.price),
      mrp: Number(variant.mrp || variant.price),
      stock: Number(variant.stock),
      active: variant.active,
      maxQty: Number(variant.maxQty) || 10,
    })),
  };
}

export default function ProductsAdmin() {
  const products = useAdmin<{ products: (Product & { category: string })[] }>("/api/admin/products");
  const categories = useAdmin<{ categories: Category[] }>("/api/admin/categories");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data?.products ?? []).filter(
      (product) => (!category || product.categoryId === category) && (!q || product.name.toLowerCase().includes(q)),
    );
  }, [products.data, query, category]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const setVariant = (index: number, patch: Partial<VariantDraft>) =>
    setDraft((current) =>
      current ? { ...current, variants: current.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) } : current,
    );
  const setPerKg = (perKg: string) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            perKg,
            variants: current.variants.map((v) => {
              const price = priceFor(perKg, v.label);
              return price === null ? v : { ...v, price, mrp: "" };
            }),
          }
        : current,
    );
  const setWeight = (index: number, label: string) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            variants: current.variants.map((v, i) => {
              if (i !== index) return v;
              const price = priceFor(current.perKg, label);
              return price === null ? { ...v, label } : { ...v, label, price, mrp: "" };
            }),
          }
        : current,
    );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const ok = await attempt(
      () => saveAdmin(draft.id ? `/api/admin/products/${draft.id}` : "/api/admin/products", toBody(draft), draft.id ? "PUT" : "POST"),
      draft.id ? "Product updated" : "Product added",
    );
    setBusy(false);
    if (ok) {
      setDraft(null);
      await products.reload();
    }
  }

  async function toggleActive(product: Product) {
    await attempt(
      () => saveAdmin(`/api/admin/products/${product.id}`, toBody({ ...toDraft(product), active: !product.active }), "PUT"),
      product.active ? `${product.name} is hidden from the shop` : `${product.name} is live`,
    );
    await products.reload();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This can't be undone. Hiding it keeps it for later.`)) return;
    const ok = await attempt(() => saveAdmin(`/api/admin/products/${product.id}`, {}, "DELETE"), "Product deleted");
    if (ok) {
      setDraft(null);
      await products.reload();
    }
  }

  const categoryOptions = [
    { value: "", label: "Choose a category" },
    ...(categories.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <AdminHeader
        title="Products"
        description="Prices, weights and stock here are exactly what customers see."
        action={
          <Button className="h-10 rounded-xl font-bold" onClick={() => setDraft({ ...blank, variants: [blankVariant()] })}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />
      {products.error && <ErrorBanner message={products.error} onRetry={() => void products.reload()} />}

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products" />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-10 rounded-xl border bg-white px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Panel bodyClassName="p-0">
        {!products.data ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyRow icon={Package} title={query || category ? "No matching products" : "No products yet"} body="Add your first cut to start selling." />
        ) : (
          <ul className="divide-y">
            {rows.map((product) => {
              const stock = product.variants.reduce((sum, v) => sum + (v.active ? v.stock : 0), 0);
              return (
                <li key={product.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 md:flex-nowrap">
                  <button type="button" onClick={() => setDraft(toDraft(product))} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                    <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0].url} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageOff className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold hover:text-primary">{product.name}</span>
                        {product.featured && <Badge tone="blue">Featured</Badge>}
                        {!product.active && <Badge>Hidden</Badge>}
                        {product.active && stock === 0 && <Badge tone="red">Sold out</Badge>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{product.category || "No category"}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {product.variants.map((v) => (
                          <span
                            key={v.id}
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[11px]",
                              !v.active && "opacity-50 line-through",
                              v.active && v.stock === 0 && "border-red-200 bg-red-50 text-red-700",
                            )}
                          >
                            {v.label} · {formatINR(v.price)} · {v.stock} left
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={product.active} onChange={() => void toggleActive(product)} label={`Show ${product.name} in the shop`} />
                      {product.active ? "Live" : "Hidden"}
                    </span>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDraft(toDraft(product))}>
                      Edit
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Sheet open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          {draft && (
            <form onSubmit={save} className="flex min-h-full flex-col">
              <SheetHeader className="border-b px-6 py-5">
                <SheetTitle className="text-xl font-extrabold">{draft.id ? "Edit product" : "New product"}</SheetTitle>
                <SheetDescription>Prices are in rupees. Customers only see active weights.</SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" value={draft.name} onChange={(v) => set("name", v)} className="sm:col-span-2" placeholder="Boneless Chicken" />
                  <SelectField label="Category" value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={categoryOptions} />
                  <Field label="URL slug" value={draft.slug} onChange={(v) => set("slug", v)} hint="Leave empty to use the name." placeholder="boneless-chicken" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold">Weights &amp; prices</p>
                    <button
                      type="button"
                      onClick={() => set("variants", [...draft.variants, blankVariant("")])}
                      className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <Plus className="size-4" /> Add weight
                    </button>
                  </div>
                  <Field
                    label="Price per kg"
                    prefix="₹"
                    inputMode="decimal"
                    value={draft.perKg}
                    onChange={setPerKg}
                    placeholder="180"
                    hint="Fills the price for every weight below and clears old MRPs. Add an MRP afterwards only if you want to show a discount."
                    className="mt-3"
                  />
                  <div className="mt-3 space-y-2.5">
                    {draft.variants.map((variant, index) => (
                      <div key={variant.id || index} className={cn("rounded-xl border bg-muted/30 p-3", !variant.active && "opacity-70")}>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Field label="Weight" value={variant.label} onChange={(v) => setWeight(index, v)} placeholder="500g" />
                          <Field label="Price" prefix="₹" inputMode="decimal" value={variant.price} onChange={(v) => setVariant(index, { price: v })} />
                          <Field label="MRP" prefix="₹" inputMode="decimal" value={variant.mrp} onChange={(v) => setVariant(index, { mrp: v })} />
                          <Field label="Stock" inputMode="numeric" value={variant.stock} onChange={(v) => setVariant(index, { stock: v })} />
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Switch checked={variant.active} onChange={(v) => setVariant(index, { active: v })} label={`Sell ${variant.label || "this weight"}`} />
                            {variant.active ? "On sale" : "Off"}
                          </span>
                          {draft.variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => set("variants", draft.variants.filter((_, i) => i !== index))}
                              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Leave MRP empty if there is no discount. Use labels like 250g, 500g, 1 kg.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_96px] sm:items-end">
                  <Field label="Photo URL" value={draft.image} onChange={(v) => set("image", v)} placeholder="/media/boneless.jpg" />
                  <span className="grid size-24 place-items-center overflow-hidden rounded-xl border bg-muted">
                    {draft.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.image} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" />
                    )}
                  </span>
                </div>

                <Field label="Description" area value={draft.description} onChange={(v) => set("description", v)} />
                <Field label="What you get" area value={draft.details} onChange={(v) => set("details", v)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Storage" area value={draft.storage} onChange={(v) => set("storage", v)} />
                  <Field label="Preparation" area value={draft.preparation} onChange={(v) => set("preparation", v)} />
                </div>

                <div className="space-y-2">
                  <Toggle checked={draft.active} onChange={(v) => set("active", v)} label="Show in the shop" description="Turn off to hide it without deleting." />
                  <Toggle checked={draft.featured} onChange={(v) => set("featured", v)} label="Feature on the homepage" description="Shown under Popular Picks." />
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-white px-6 py-4">
                {draft.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const product = products.data?.products.find((p) => p.id === draft.id);
                      if (product) void remove(product);
                    }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  <SubmitButton busy={busy}>{draft.id ? "Save changes" : "Add product"}</SubmitButton>
                </div>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
