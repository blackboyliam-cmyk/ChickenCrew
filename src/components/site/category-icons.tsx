import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type IconProps = { className?: string };

const s = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={cn("text-foreground", className)} aria-hidden>
      {children}
    </svg>
  );
}

export function IconLegs({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M20 22c8-6 20-2 24 8 3 8 0 18-8 24-5 4-10 5-13 3-4-3-4-9-2-16 1-4 0-10-1-19z" {...s} />
      <path d="M28 48c4 8 6 16 6 20" {...s} />
      <path d="M30 66c-2 4 1 7 4 6 3-1 4-5 2-7-1-2-4-1-6 1z" {...s} />
      <path d="M58 20c-8-4-18 2-20 12-2 9 4 18 13 22 5 2 10 1 12-2 3-4 1-10-2-16-2-4-1-10-3-16z" {...s} />
      <path d="M52 48c-2 8-2 16 0 20" {...s} />
      <path d="M50 66c2 4 6 5 8 2 2-3-1-6-4-6-2 0-4 2-4 4z" {...s} />
    </Frame>
  );
}

export function IconLiver({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M18 42c0-12 10-18 18-16 4 1 7 4 10 4s7-3 12 0c8 4 12 14 8 22-3 8-10 14-18 14-7 0-13-3-18-10-3-4-5-8-12-14z" {...s} />
      <path d="M48 36c6-2 14 0 16 8 2 7-2 14-8 16" {...s} />
    </Frame>
  );
}

export function IconGizzard({ className }: IconProps) {
  return (
    <Frame className={className}>
      <ellipse cx="32" cy="40" rx="14" ry="16" {...s} />
      <ellipse cx="52" cy="42" rx="12" ry="14" {...s} />
      <path d="M26 36c4 0 8 2 10 6M48 38c3 1 6 3 8 6" {...s} strokeWidth={1.6} />
    </Frame>
  );
}

export function IconCombo({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M14 34h52l-5 30a4 4 0 0 1-4 3H23a4 4 0 0 1-4-3z" {...s} />
      <path d="M28 34l6-14M52 34l-6-14" {...s} />
      <path d="M30 46v10M40 46v10M50 46v10" {...s} strokeWidth={1.8} />
    </Frame>
  );
}

export function IconSpecial({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M46 16c9 0 16 7 16 16 0 9-8 17-17 16l-7 7" {...s} />
      <path d="M38 55a6 6 0 1 1-7 7 6 6 0 1 1 0-12" {...s} />
      <path d="M45 48c-10 1-17-7-16-16 0-9 8-16 17-16" {...s} />
      <path d="M50 24c3 1 5 3 6 6" {...s} strokeWidth={1.8} />
    </Frame>
  );
}

export function IconOffer({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M14 40V18a4 4 0 0 1 4-4h22l26 26-26 26z" {...s} />
      <circle cx="27" cy="27" r="4" {...s} />
      <path d="M34 50l14-14" {...s} strokeWidth={1.8} />
    </Frame>
  );
}

export function IconDefaultCut({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="40" cy="40" r="18" {...s} />
      <path d="M40 26v28M26 40h28" {...s} />
    </Frame>
  );
}

const SVG_ICON: Record<string, ComponentType<IconProps>> = {
  "chicken-legs": IconLegs,
  "chicken-lollipop": IconLegs,
  "chicken-liver": IconLiver,
  liver: IconLiver,
  "chicken-gizzard": IconGizzard,
  gizzard: IconGizzard,
  "special-cuts": IconSpecial,
  combos: IconCombo,
  "family-curry-pack": IconCombo,
  offers: IconOffer,
};

/** Shop-supplied line-art drawings, preferred over the SVG set when present. */
const LOGO_BY_SLUG: Record<string, string> = {
  "whole-chicken": "/media/icons/whole-chicken.png",
  "curry-cut": "/media/icons/curry-cut.png",
  "boneless-chicken": "/media/icons/boneless-chicken.png",
  boneless: "/media/icons/boneless.png",
  "chicken-breast": "/media/icons/chicken-breast.png",
  "chicken-legs": "/media/icons/chicken-legs.png",
  "chicken-lollipop": "/media/icons/chicken-legs.png",
  "chicken-wings": "/media/icons/chicken-wings.png",
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const logo = LOGO_BY_SLUG[slug];
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        loading="lazy"
        className={cn("h-full w-full object-contain mix-blend-multiply", className)}
        draggable={false}
      />
    );
  }
  const Comp = SVG_ICON[slug] ?? IconDefaultCut;
  return <Comp className={cn("h-full w-full", className)} />;
}
