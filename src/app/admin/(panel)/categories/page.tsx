"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { Category } from "@/lib/types";

export default function CategoriesAdmin() {
  const { data, reload } = useAdmin<{ categories: Category[] }>("/api/admin/categories");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Categories</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {data?.categories.map((category) => (
          <li key={category.id} className="rounded-xl border px-3 py-2">{category.name} · /{category.slug}</li>
        ))}
      </ul>
      <form
        className="mt-4 grid max-w-md gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveAdmin("/api/admin/categories", { name, image, imageAlt: name, sort: (data?.categories.length || 0) + 1 }).then(() => {
            setName("");
            setImage("");
            return reload();
          });
        }}
      >
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Image" value={image} onChange={setImage} />
        <Button type="submit">Add category</Button>
      </form>
    </div>
  );
}
