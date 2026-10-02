import { handle } from "@/lib/http";
import { buildFaqs, getPublicSettings, listDeliverySlots } from "@/lib/store";

export const GET = handle(async () => {
  const settings = getPublicSettings();
  const slots = listDeliverySlots().flatMap((group) => group.slots.map((slot) => slot.label));
  return { settings, faqs: buildFaqs(settings, [...new Set(slots)]) };
});
