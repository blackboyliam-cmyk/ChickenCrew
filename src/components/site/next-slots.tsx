import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

export type NextSlotItem = {
  id: string;
  timeLabel: string;
  dayLabel: string;
  remaining: number;
};

type NextSlotsProps = {
  slots: NextSlotItem[];
  className?: string;
  href?: string;
};

export function NextSlots({ slots, className, href = "/checkout" }: NextSlotsProps) {
  if (slots.length === 0) return null;

  return (
    <section className={cn("py-6 md:py-8", className)} aria-labelledby="next-slots-heading">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden>
          <CalendarClock className="size-5 text-primary" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id="next-slots-heading" className="text-[17px] font-bold tracking-tight text-foreground">
            Next slots
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Available delivery windows</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {slots.map((slot) => (
          <li key={slot.id}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-2xl bg-[#f7f0e8] px-3.5 py-3.5 transition-colors hover:bg-[#f1e8de] active:bg-[#ebe1d5]"
            >
              <span className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-card px-3.5 py-2 text-[13px] font-bold tracking-tight text-foreground sm:text-sm">
                {slot.timeLabel}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[15px] font-bold text-foreground">{slot.dayLabel}</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {slot.remaining <= 0 ? "Full" : slot.remaining <= 3 ? `${slot.remaining} left` : "Available"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
