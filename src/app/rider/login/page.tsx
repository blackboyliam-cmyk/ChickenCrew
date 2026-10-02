"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";

export default function RiderLoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const ready = phone.length === 10 && pin.length >= 4;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/rider/login", { method: "POST", body: { phone, pin } });
      router.replace("/rider");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-charcoal px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
      />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-black">CC</span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight">ChickenCrew</span>
            <span className="block text-xs text-white/55">Rider app</span>
          </span>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white p-7 shadow-float sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Bike className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Rider sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use the mobile number and PIN the shop gave you.</p>

          <label htmlFor="phone" className="mt-6 block text-[13px] font-semibold">
            Mobile number
          </label>
          <div className="mt-1.5 flex h-12 items-center rounded-xl border bg-white focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
            <span className="pl-3.5 text-[15px] text-muted-foreground">+91</span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              maxLength={10}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] tracking-wide outline-none"
            />
          </div>

          <label htmlFor="pin" className="mt-4 block text-[13px] font-semibold">
            PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            className="mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-lg tracking-[0.4em] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
            aria-invalid={Boolean(error)}
          />
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!ready || busy} className="mt-5 h-12 w-full rounded-xl text-[15px] font-bold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Forgot your PIN? Ask the shop to reset it.</p>
        </form>
      </div>
    </main>
  );
}
