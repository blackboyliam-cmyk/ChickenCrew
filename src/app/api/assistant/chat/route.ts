import { ApiError } from "@/lib/errors";
import { groqChat } from "@/lib/groq";
import { handle, readJson } from "@/lib/http";
import { listProducts } from "@/lib/store";
import { cleanText } from "@/lib/validators";

type Mode = "cooking" | "gym";

type Suggestion = { label: string; searchQuery: string; reason?: string };

function fallbackReply(message: string, mode: Mode, item: string): { reply: string; suggestions: Suggestion[] } {
  const lower = message.toLowerCase();
  if (mode === "gym") {
    return {
      reply: `For a high-protein plate with ${item}, lean cuts are the simple choice. Grill or boil with little oil. This is general food inspiration, not medical advice.`,
      suggestions: [
        { label: "Chicken breast", searchQuery: "chicken breast", reason: "Lean and high protein" },
        { label: "Boneless", searchQuery: "boneless", reason: "Easy to portion" },
        { label: "Chicken legs", searchQuery: "chicken legs", reason: "More flavour, still simple" },
      ],
    };
  }
  if (lower.includes("curry")) {
    return {
      reply: `Chicken curry with ${item} works well with curry cut or legs. Add another pack if the pot needs more.`,
      suggestions: [
        { label: "Curry cut", searchQuery: "curry cut", reason: "Made for curry" },
        { label: "Chicken legs", searchQuery: "chicken legs", reason: "Stays juicy" },
        { label: "Boneless", searchQuery: "boneless", reason: "Extra meat" },
      ],
    };
  }
  return {
    reply: `You're cooking ${message}. These cuts from the shop sit well with ${item}.`,
    suggestions: [
      { label: "Curry cut", searchQuery: "curry cut" },
      { label: "Boneless", searchQuery: "boneless" },
      { label: "Chicken legs", searchQuery: "chicken legs" },
    ],
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
  const names = listProducts({ pageSize: "48" }).items.map((product) => product.name);
  const cartSummary = cartItems.map((line) => `${line.name} ${line.weight} ×${line.qty}`).join(", ");
  const catalogue = names.join(", ") || "Curry Cut, Boneless Chicken, Chicken Breast, Chicken Legs, Chicken Liver, Chicken Gizzard";
  const format = `Return only JSON: {"reply":"...","suggestions":[{"label":"...","searchQuery":"...","reason":"..."}]}. Give 2 to 4 suggestions. Every suggestion must be a product from this list, with label and searchQuery set to the exact product name: ${catalogue}. Never suggest recipes, sides, vegetables or anything not on the list. reason is under 8 words.`;
  const system =
    mode === "gym"
      ? `You are a friendly assistant for Karthika Chicken Centre (ChickenCrew), a fresh chicken shop in India. The customer wants gym-friendly, high-protein meal ideas. Answer their actual question: suggest a dish, roughly how much chicken to buy, and one quick cooking tip. Keep the reply to 2-4 short sentences. No medical claims; mention ideas are general, not medical advice. ${format}`
      : `You are a friendly cooking assistant for Karthika Chicken Centre (ChickenCrew), a fresh chicken shop in India. Answer the customer's actual question in plain Indian home-cooking language: which cut suits their dish, roughly how much to buy for the number of people (about 250 g per person for curries), and one quick cooking tip. Mention what is already in their cart if relevant. Keep the reply to 2-4 short sentences. ${format}`;

  const raw = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: `Cart: ${cartSummary || "empty"}\nCustomer says: ${message}` },
    ],
    { maxTokens: 1200, json: true },
  );

  let reply = fallbackReply(message, mode, item);
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
          const product = names.find((name) => name.toLowerCase() === wanted.toLowerCase());
          if (!product) return [];
          const reason = cleanText(entry.reason, 120);
          return [{ label: product, searchQuery: product, ...(reason ? { reason } : {}) }];
        });
      const text = cleanText(json.reply, 600);
      if (text) reply = { reply: text, suggestions: suggestions.length ? suggestions : reply.suggestions };
    } catch {
      reply = fallbackReply(message, mode, item);
    }
  }

  return { ...reply, poweredByGroq: Boolean(process.env.GROQ_API_KEY) };
});
