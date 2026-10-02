import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buildFaqs, getPublicSettings, listDeliverySlots, withDb } from "@/lib/store";

export const metadata: Metadata = { title: "FAQ", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const { settings, groups } = await withDb(() => ({ settings: getPublicSettings(), groups: listDeliverySlots() }));
  const slots = groups.flatMap((group) => group.slots.map((slot) => `${group.label} ${slot.label}`));
  const faqs = buildFaqs(settings, slots.slice(0, 6));
  return (
    <div className="py-8">
      <h1 className="text-3xl font-semibold tracking-tight">FAQ</h1>
      <Accordion type="single" collapsible className="mt-6">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.q} value={`q-${index}`}>
            <AccordionTrigger>{faq.q}</AccordionTrigger>
            <AccordionContent>{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
