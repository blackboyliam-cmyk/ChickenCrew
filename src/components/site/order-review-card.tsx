"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Props = {
  orderId: string;
  initial?: { rating: number; comment: string } | null;
  onSaved?: (review: { rating: number; comment: string }) => void;
  autoFocus?: boolean;
};

export function OrderReviewCard({ orderId, initial = null, onSaved, autoFocus }: Props) {
  const [rating, setRating] = useState(initial?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(Boolean(initial));

  if (done) {
    const shown = initial || { rating, comment };
    return (
      <section className="rounded-3xl border bg-card p-5" aria-label="Your rating">
        <h2 className="text-sm font-bold">Thanks for your rating</h2>
        <div className="mt-2 flex gap-1" aria-label={`${shown.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={cn("size-5", value <= shown.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
              aria-hidden
            />
          ))}
        </div>
        {shown.comment && <p className="mt-2 text-sm text-muted-foreground">{shown.comment}</p>}
      </section>
    );
  }

  async function save() {
    if (rating < 1) {
      setError("Tap a star to rate your order.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ review: { rating: number; comment: string } }>(`/api/orders/${orderId}/review`, {
        method: "POST",
        body: { rating, comment },
      });
      setDone(true);
      onSaved?.(data.review);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save your rating.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="review"
      className={cn("scroll-mt-28 rounded-3xl border bg-card p-5", autoFocus && "ring-2 ring-primary/30")}
      aria-labelledby="review-title"
    >
      <h2 id="review-title" className="text-base font-bold">
        How was your delivery?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">A quick rating helps us keep the chicken fresh and on time.</p>
      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= (hover || rating);
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value)}
              className="rounded-lg p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("size-8", active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35")} aria-hidden />
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-xs font-semibold text-muted-foreground" htmlFor={`review-comment-${orderId}`}>
        Optional note
      </label>
      <textarea
        id={`review-comment-${orderId}`}
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 400))}
        rows={2}
        placeholder="Anything we should know?"
        className="mt-1.5 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : "Submit rating"}
      </button>
    </section>
  );
}
