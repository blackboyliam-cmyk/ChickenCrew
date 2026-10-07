"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiClientError } from "@/lib/api-client";
import { useShop } from "@/components/site/shop-context";

const REMEMBER_EMAIL_KEY = "cc_remember_email";

function message(err: unknown) {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.";
}

export function PasswordSignIn({ onDone }: { onDone?: () => void }) {
  const { refreshUser } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
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
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ admin?: boolean }>("/api/auth/password", {
        method: "POST",
        body: { email: email.trim(), password, remember },
      });
      try {
        if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        /* ignore */
      }
      await refreshUser();
      if (result.admin) {
        window.location.href = "/admin";
        return;
      }
      onDone?.();
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pw-email" className="text-[13px] font-semibold">
          Email
        </label>
        <input
          id="pw-email"
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
      </div>
      <div>
        <label htmlFor="pw-password" className="text-[13px] font-semibold">
          Password
        </label>
        <div className="mt-1.5 flex h-12 items-center rounded-xl border bg-white focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
          <input
            id="pw-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none"
            placeholder="Password"
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
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
        <Checkbox checked={remember} onCheckedChange={(value) => setRemember(value === true)} />
        Remember me
      </label>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !email.trim() || !password} className="h-12 w-full rounded-xl text-[15px] font-bold">
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in with password"}
      </Button>
    </form>
  );
}

export { REMEMBER_EMAIL_KEY };
