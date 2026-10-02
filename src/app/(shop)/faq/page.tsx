import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { buildFaqs, getPublicSettings, listDeliverySlots, withDb } from "@/lib/store";

export const metadata: Metadata = { title: "FAQ", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const { settings, groups } = await withDb(() => ({ settings: getPublicSettings(), groups: listDeliverySlots() }));
  const slots = groups.flatMap((group) => group.slots.map((slot) => `${group.label} ${slot.label}`));
  const faqs = buildFaqs(settings, slots.slice(0, 6));

  return (
    <div className="pb-6">
      <PageHero eyebrow="Help centre" title="Frequently asked questions" body="Ordering, delivery, payments and freshness, answered." />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Accordion type="single" collapsible className="space-y-2.5">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.q} value={`q-${index}`} className="rounded-2xl border bg-white px-5 shadow-card last:border-b">
              <AccordionTrigger className="py-4 text-left text-[15px] font-bold hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <aside className="h-fit rounded-2xl bg-charcoal p-6 text-white lg:sticky lg:top-24">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10">
            <MessageCircle className="size-5" />
          </span>
          <p className="mt-4 text-lg font-extrabold">Still have a question?</p>
          <p className="mt-1 text-sm text-white/70">Our team will help you with orders, cuts and delivery.</p>
          <Button asChild className="mt-5 h-11 w-full rounded-xl font-bold">
            <Link href="/contact">Contact us</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
