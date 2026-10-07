"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiClientError } from "@/lib/api-client";

const ADMIN_REMEMBER_EMAIL_KEY = "cc_admin_remember_email";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { method: "POST", body: { email: email.trim(), password, remember } });
      try {
        if (remember && email.trim()) localStorage.setItem(ADMIN_REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
        else localStorage.removeItem(ADMIN_REMEMBER_EMAIL_KEY);
      } catch {
        /* ignore */
      }
      router.push("/admin");
      router.refresh();
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
            <span className="block text-xs text-white/55">Karthika Chicken Centre</span>
          </span>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white p-7 shadow-float sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Shop admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage orders, products and delivery.</p>

          <label htmlFor="email" className="mt-6 block text-[13px] font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            className="mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
            placeholder="you@example.com"
          />

          <label htmlFor="password" className="mt-4 block text-[13px] font-semibold">
            Password
          </label>
          <div className="mt-1.5 flex h-12 items-center rounded-xl border bg-white focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none"
              aria-invalid={Boolean(error)}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="grid size-11 place-items-center text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(value) => setRemember(value === true)} />
            Remember me
          </label>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!password || busy} className="mt-5 h-12 w-full rounded-xl text-[15px] font-bold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <Link href="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="size-4" /> Back to the shop
        </Link>
      </div>
    </main>
  );
}
