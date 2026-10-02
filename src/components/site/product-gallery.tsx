"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return (
      <div className="grid aspect-square place-items-center rounded-3xl bg-muted text-sm text-muted-foreground">
        Photo coming soon
      </div>
    );
  }

  function show(next: number) {
    setIndex(next);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      <div className="relative -mx-4 overflow-hidden md:mx-0 md:rounded-3xl">
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-muted"
          onScroll={(event) => {
            const el = event.currentTarget;
            const next = Math.round(el.scrollLeft / el.clientWidth);
            if (next !== index) setIndex(next);
          }}
        >
          {images.map((image, i) => (
            <div key={image.url} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={image.url}
                alt={image.alt || name}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 600px, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {images.map((image, i) => (
              <span key={image.url} className={cn("h-1.5 rounded-full bg-white transition-all", i === index ? "w-5" : "w-1.5 opacity-60")} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden gap-2 md:flex" role="tablist" aria-label="Product photos">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => show(i)}
              className={cn(
                "relative size-[72px] overflow-hidden rounded-xl border-2 transition-colors",
                i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={image.url} alt="" fill className="object-cover" sizes="72px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
