"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, Dumbbell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { useShop } from "@/components/site/shop-context";

type Mode = "cooking" | "gym";
type Suggestion = { label: string; searchQuery: string; reason?: string };

const cookingChips = ["Chicken curry", "Biryani", "Fry", "Soup"];
const gymChips = ["High protein", "Lean lunch", "Post-workout"];
const PROMPTED = "cc_meal_prompted";
const OPEN_ASSISTANT = "cc:open-assistant";

export function openMealAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT));
}

export function MealAssistant() {
  const { cart } = useShop();
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [mode, setMode] = useState<Mode>("cooking");
  const [reply, setReply] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function show(name: string) {
      setProductName(name);
      setMode("cooking");
      setReply("");
      setSuggestions([]);
      setError("");
      setInput("");
      setOpen(true);
    }
    function onAdded(event: Event) {
      try {
        if (localStorage.getItem(PROMPTED)) return;
        localStorage.setItem(PROMPTED, new Date().toISOString());
      } catch {
        return;
      }
      show((event as CustomEvent<{ name?: string }>).detail?.name || "");
    }
    const onOpen = () => show("");
    window.addEventListener("cc:added", onAdded);
    window.addEventListener(OPEN_ASSISTANT, onOpen);
    return () => {
      window.removeEventListener("cc:added", onAdded);
      window.removeEventListener(OPEN_ASSISTANT, onOpen);
    };
  }, []);

  async function ask(text: string, nextMode = mode) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setInput("");
    try {
      const data = await api<{ reply: string; suggestions: Suggestion[] }>("/api/assistant/chat", {
        method: "POST",
        body: {
          message,
          mode: nextMode,
          cartItems: (cart?.items || []).map((item) => ({
            name: item.name,
            weight: item.weight,
            qty: item.qty,
          })),
        },
      });
      setReply(data.reply);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const chips = mode === "gym" ? gymChips : cookingChips;
  const name = productName || cart?.items[0]?.name || "";

  return (
    <section
      className="fixed right-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 w-[min(100%-2rem,22rem)] animate-fade-up rounded-2xl border bg-card p-4 shadow-float md:bottom-6"
      aria-label="Cooking ideas"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">What are you making?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {name ? `${name} is in your cart. ` : ""}Get ideas, or close this — we won&apos;t ask again.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close cooking ideas" onClick={() => setOpen(false)}>
          <X />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant={mode === "cooking" ? "default" : "outline"} onClick={() => setMode("cooking")}>
          <ChefHat /> Cook
        </Button>
        <Button type="button" variant={mode === "gym" ? "default" : "outline"} onClick={() => setMode("gym")}>
          <Dumbbell /> Gym
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            onClick={() => void ask(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === "gym" ? "High protein dinner" : "Chicken curry"}
          aria-label="What are you making"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "..." : "Ask"}
        </Button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {reply && <p className="mt-3 text-sm leading-6">{reply}</p>}
      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((item) => (
            <li key={item.searchQuery}>
              <Link href={`/shop?q=${encodeURIComponent(item.searchQuery)}`} className="block rounded-xl border px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                <span className="font-medium">{item.label}</span>
                {item.reason && <span className="mt-0.5 block text-xs text-muted-foreground">{item.reason}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
