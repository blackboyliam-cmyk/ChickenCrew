import Link from "next/link";

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
      <path
        d="M19.5 4.5c4.4 0 8 3.6 8 8 0 4.6-3.8 8.3-8.4 8l-3.3 3.3a3 3 0 1 1-3.4 3.4 3 3 0 1 1 .1-5.9L15.8 18c-.3-4.6 3.3-8.5 3.7-13.5Z"
        fill="currentColor"
      />
      <path d="M20 8.5c2 .3 3.5 1.8 3.8 3.8" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label="ChickenCrew home">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform duration-200 group-hover:-rotate-6 md:size-10">
        <Mark />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-[family-name:var(--font-plus-jakarta)] text-base leading-none font-extrabold tracking-tight text-foreground md:text-[17px]">
          Chicken<span className="text-primary">Crew</span>
        </span>
        {!compact && (
          <span className="mt-1 hidden text-[11px] font-medium text-muted-foreground sm:block">
            by Karthika Chicken Centre
          </span>
        )}
      </span>
    </Link>
  );
}
