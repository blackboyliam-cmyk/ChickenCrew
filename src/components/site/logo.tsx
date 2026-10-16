import Image from "next/image";
import Link from "next/link";

export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <Image
      src="/brand/app-icon.png"
      alt=""
      width={80}
      height={80}
      className={`rounded-xl ${className}`}
      aria-hidden
      priority
    />
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="ChickenCrew home">
      <span className="shrink-0 overflow-hidden rounded-xl transition-transform duration-200 group-hover:-rotate-6">
        <Mark className="size-9 md:size-10" />
      </span>
      <span>
        <span className="block font-[family-name:var(--font-plus-jakarta)] text-base leading-none font-extrabold tracking-tight whitespace-nowrap text-foreground md:text-[17px]">
          Chicken<span className="text-primary">Crew</span>
        </span>
        {!compact && (
          <span className="mt-1 hidden text-[11px] font-medium whitespace-nowrap text-muted-foreground lg:block">
            by Karthika Chicken Centre
          </span>
        )}
      </span>
    </Link>
  );
}
