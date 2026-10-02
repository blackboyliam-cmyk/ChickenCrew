"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { Category, Product } from "@/lib/types";

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
  label: string;
  sku: string;
  price: string;
  mrp: string;
  stock: string;
  variantId?: string;
  otherVariants: { id?: string; label: string; sku: string; price: number; mrp: number; stock: number }[];
};

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
  label: "500g",
  sku: "",
  price: "",
  mrp: "",
  stock: "0",
  otherVariants: [],
};

export default function ProductsAdmin() {
  const products = useAdmin<{ products: (Product & { category: string })[] }>("/api/admin/products");
  const categories = useAdmin<{ categories: Category[] }>("/api/admin/categories");
  const [draft, setDraft] = useState<Draft>(blank);

  function edit(product: Product) {
    const variant = product.variants[0];
    setDraft({
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
      label: variant?.label || "500g",
      sku: variant?.sku || "",
      price: variant ? String(variant.price / 100) : "",
      mrp: variant ? String(variant.mrp / 100) : "",
      stock: variant ? String(variant.stock) : "0",
      variantId: variant?.id,
      otherVariants: product.variants.slice(1).map((item) => ({
        id: item.id,
        label: item.label,
        sku: item.sku,
        price: item.price / 100,
        mrp: item.mrp / 100,
        stock: item.stock,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Products</h1>
      {products.error && <p className="text-sm text-destructive">{products.error}</p>}
      <ul className="space-y-2 text-sm">
        {products.data?.products.map((product) => (
          <li key={product.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span>
              {product.name} <span className="text-muted-foreground">{product.active ? "" : "· hidden"}</span>
            </span>
            <span className="flex gap-2">
              <button type="button" className="underline" onClick={() => edit(product)}>Edit</button>
              <button type="button" className="underline" onClick={() => saveAdmin(`/api/admin/products/${product.id}`, {}, "DELETE").then(products.reload)}>Remove</button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-3 rounded-2xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const body = {
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
            variants: [
              {
                id: draft.variantId,
                label: draft.label,
                sku: draft.sku,
                price: Number(draft.price),
                mrp: Number(draft.mrp || draft.price),
                stock: Number(draft.stock),
                active: true,
              },
              ...draft.otherVariants,
            ],
          };
          const path = draft.id ? `/api/admin/products/${draft.id}` : "/api/admin/products";
          void saveAdmin(path, body, draft.id ? "PUT" : "POST").then(() => {
            setDraft(blank);
            return products.reload();
          });
        }}
      >
        <h2 className="font-semibold">{draft.id ? "Edit product" : "New product"}</h2>
        <p className="text-xs text-muted-foreground">Prices are in rupees. This form edits the first weight. Add more weights by saving, then editing again is limited to one weight in this screen — include the weight you sell most.</p>
        <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <Field label="Slug" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug })} />
        <label className="text-sm">
          Category
          <select className="mt-1 h-11 w-full rounded-lg border px-3" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
            <option value="">Choose</option>
            {categories.data?.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <Field label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} area />
        <Field label="Details" value={draft.details} onChange={(details) => setDraft({ ...draft, details })} area />
        <Field label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
        <Field label="Image alt" value={draft.imageAlt} onChange={(imageAlt) => setDraft({ ...draft, imageAlt })} />
        <Field label="Weight" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
        <Field label="SKU" value={draft.sku} onChange={(sku) => setDraft({ ...draft, sku })} />
        <Field label="Price" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
        <Field label="MRP" value={draft.mrp} onChange={(mrp) => setDraft({ ...draft, mrp })} />
        <Field label="Stock" value={draft.stock} onChange={(stock) => setDraft({ ...draft, stock })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />
          Featured on the homepage
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <Button type="submit">Save product</Button>
      </form>
    </div>
  );
}
