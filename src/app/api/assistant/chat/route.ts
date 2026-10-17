import { ApiError } from "@/lib/errors";
import { groqChat } from "@/lib/groq";
import { handle, readJson } from "@/lib/http";
import { listProducts } from "@/lib/store";
import { cleanText } from "@/lib/validators";

type Mode = "cooking" | "gym";

type Suggestion = {
  label: string;
  searchQuery: string;
  reason?: string;
  productId?: string | null;
  variantId?: string | null;
};

function fallbackReply(message: string, mode: Mode, item: string, catalogue: Suggestion[]): { reply: string; suggestions: Suggestion[] } {
  const pick = (...queries: string[]) =>
    queries
      .map((query) => catalogue.find((entry) => entry.label.toLowerCase().includes(query)))
      .filter((entry): entry is Suggestion => Boolean(entry))
      .slice(0, 3);
  const lower = message.toLowerCase();
  if (mode === "gym") {
    return {
      reply: `High-protein plate with ${item} (about 150–200 g cooked chicken per person).\n\n1. Marinate lean pieces with salt, pepper, chilli, and a little oil for 15 minutes.\n2. Grill or pan-sear on medium-high until cooked through (no pink inside).\n3. Rest 2 minutes, slice, and plate with dal or salad.\n\nGeneral food inspiration, not medical advice.`,
      suggestions: pick("breast", "boneless", "leg").map((entry, index) => ({
        ...entry,
        reason: ["Lean and high protein", "Easy to portion", "More flavour, still simple"][index],
      })),
    };
  }
  if (lower.includes("curry")) {
    return {
      reply: `Chicken curry with ${item} — about 250 g per person.\n\n1. Heat oil, fry onion until soft, then ginger-garlic paste.\n2. Add chilli, turmeric, coriander, and salt; cook 1 minute.\n3. Add chicken and sear until the colour changes.\n4. Pour in tomato or a little water, cover, and simmer 20–25 minutes until tender.\n5. Finish with garam masala and coriander leaves.`,
      suggestions: pick("curry", "leg", "boneless").map((entry, index) => ({
        ...entry,
        reason: ["Made for curry", "Stays juicy", "Extra meat"][index],
      })),
    };
  }
  return {
    reply: `${message} with ${item} — about 250 g chicken per person.\n\n1. Pat the chicken dry and season with salt and spices.\n2. Heat a little oil in a pan on medium.\n3. Cook until golden and no pink remains inside.\n4. Rest a minute, then serve hot with rice or roti.`,
    suggestions: pick("curry", "boneless", "leg"),
  };
}

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const message = cleanText(body.message, 500);
  const mode: Mode = body.mode === "gym" ? "gym" : "cooking";
  if (!message) throw new ApiError(400, "Tell us what you want to cook.");
  const rawItems = Array.isArray(body.cartItems) ? body.cartItems.slice(0, 20) : [];
  const cartItems = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = cleanText(row.name, 80);
    if (!name) return [];
    const weight = cleanText(row.weight, 40);
    const qty = Number(row.qty);
    return [{ name, weight, qty: Number.isFinite(qty) ? qty : 1 }];
  });
  const item = cartItems[0]?.name || "your chicken";
  const catalogueProducts = listProducts({ pageSize: "48" }).items;
  const names = catalogueProducts.map((product) => product.name);
  const cartSummary = cartItems.map((line) => `${line.name} ${line.weight} ×${line.qty}`).join(", ");
  const catalogue = names.join(", ") || "Curry Cut, Boneless Chicken, Chicken Breast, Chicken Legs, Chicken Liver, Chicken Gizzard";
  const format = `Return only JSON: {"reply":"...","suggestions":[{"label":"...","searchQuery":"...","reason":"..."}]}. Give 2 to 4 suggestions. Every suggestion must be a product from this list, with label and searchQuery set to the exact product name: ${catalogue}. Never put sides, vegetables, or non-catalogue items in suggestions — only shop chicken cuts. reason is under 8 words. In reply, use \\n for new lines between steps.`;
  const system =
    mode === "gym"
      ? `You are a friendly assistant for Karthika Chicken Centre (ChickenCrew), a fresh chicken shop in India. The customer wants gym-friendly, high-protein meal ideas. In reply: name a simple dish, say roughly how much lean chicken to buy, then give a clear numbered step-by-step (5–8 short steps) using common Indian kitchen ingredients. Mention cart items if relevant. No medical claims; say ideas are general, not medical advice. ${format}`
      : `You are a friendly cooking assistant for Karthika Chicken Centre (ChickenCrew), a fresh chicken shop in India. Answer in plain Indian home-cooking language. In reply: say which cut suits the dish, roughly how much to buy (about 250 g per person for curries), mention cart items if relevant, then give a clear numbered step-by-step recipe (6–10 short steps) with common pantry spices and ingredients. Keep steps practical for a home kitchen. Do not invent fancy restaurant techniques. ${format}`;

  const raw = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: `Cart: ${cartSummary || "empty"}\nCustomer says: ${message}` },
    ],
    { maxTokens: 1600, json: true },
  );

  const catalogueSuggestions: Suggestion[] = catalogueProducts.map((product) => ({
    label: product.name,
    searchQuery: product.name,
    productId: product.id,
    variantId: product.defaultVariantId,
  }));
  let reply = fallbackReply(message, mode, item, catalogueSuggestions);
  if (raw) {
    try {
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as {
        reply?: unknown;
        suggestions?: { label?: unknown; searchQuery?: unknown; reason?: unknown }[];
      };
      const suggestions = (json.suggestions || [])
        .slice(0, 4)
        .flatMap((entry) => {
          const wanted = cleanText(entry.searchQuery, 80) || cleanText(entry.label, 80);
          const product = catalogueProducts.find((row) => row.name.toLowerCase() === wanted.toLowerCase());
          if (!product) return [];
          const reason = cleanText(entry.reason, 120);
          return [
            {
              label: product.name,
              searchQuery: product.name,
              productId: product.id,
              variantId: product.defaultVariantId,
              ...(reason ? { reason } : {}),
            },
          ];
        });
      const text =
        typeof json.reply === "string"
          ? json.reply
              .replace(/\r\n/g, "\n")
              .replace(/[^\S\n]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .slice(0, 2200)
          : "";
      if (text) reply = { reply: text, suggestions: suggestions.length ? suggestions : reply.suggestions };
    } catch {
      reply = fallbackReply(message, mode, item, catalogueSuggestions);
    }
  }

  return { ...reply, poweredByGroq: Boolean(process.env.GROQ_API_KEY) };
});
