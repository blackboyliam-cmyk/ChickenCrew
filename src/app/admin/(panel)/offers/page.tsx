"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, saveAdmin, useAdmin } from "@/components/admin/forms";
import type { Offer } from "@/lib/types";

export default function OffersAdmin() {
  const { data, reload } = useAdmin<{ offers: Offer[] }>("/api/admin/offers");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [href, setHref] = useState("/shop");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [image, setImage] = useState("/media/curry.jpg");
  return (
    <div>
      <h1 className="text-2xl font-semibold">Offers</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {data?.offers.map((offer) => (
          <li key={offer.id} className="flex justify-between rounded-xl border px-3 py-2">
            <span>{offer.title}</span>
            <button type="button" className="underline" onClick={() => saveAdmin(`/api/admin/offers/${offer.id}`, {}, "DELETE").then(reload)}>Remove</button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid max-w-md gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveAdmin("/api/admin/offers", { title, description, href, price: Number(price), mrp: Number(mrp), image, imageAlt: title }).then(reload);
        }}
      >
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Description" value={description} onChange={setDescription} />
        <Field label="Link" value={href} onChange={setHref} />
        <Field label="Price" value={price} onChange={setPrice} />
        <Field label="MRP" value={mrp} onChange={setMrp} />
        <Field label="Image" value={image} onChange={setImage} />
        <Button type="submit">Add offer</Button>
      </form>
    </div>
  );
}
