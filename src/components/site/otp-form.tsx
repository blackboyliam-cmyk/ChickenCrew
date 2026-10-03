"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "cn";
import { useShop } from "@/components/site/shop-context";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

type Mode = "phone" | "email";

function message(err: unknown) {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.";
}

export function OtpForm({
  onDone,
  submitLabel = "Sign in",
  signup = false,
}: {
  onDone?: () => void;
  submitLabel?: string;
  signup?: boolean;
}) {
  const { refreshUser } = useShop();
  const [mode, setMode] = useState<Mode>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const validPhone = /^[6-9]\d{9}$/.test(phone);
  const validEmail = email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validName = !signup || name.trim().length >= 2;
  const ready = validName && (mode === "phone" ? validPhone : validEmail);
  const code = digits.join("");
  const destination = mode === "phone" ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : email;

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  useEffect(() => {
    if (sent) boxes.current[0]?.focus();
  }, [sent]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setSent(false);
    setError("");
    setDevCode("");
    setDigits(Array(CODE_LENGTH).fill(""));
    setWait(0);
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ devCode?: string }>("/api/auth/otp/send", {
        method: "POST",
        body: mode === "phone" ? { phone } : { email },
      });
      setDigits(Array(CODE_LENGTH).fill(""));
      setDevCode(data.devCode || "");
      setSent(true);
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/otp/verify", {
        method: "POST",
        body: {
          ...(mode === "phone" ? { phone } : { email }),
          code: value,
          ...(signup ? { name: name.trim() } : {}),
        },
      });
      await refreshUser();
      onDone?.();
    } catch (err) {
      setError(message(err));
      setDigits(Array(CODE_LENGTH).fill(""));
      boxes.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function fill(start: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    const next = [...digits];
    if (!incoming) {
      next[start] = "";
      setDigits(next);
      return;
    }
    for (let i = 0; i < incoming.length && start + i < CODE_LENGTH; i += 1) next[start + i] = incoming[i];
    setDigits(next);
    const focusAt = Math.min(start + incoming.length, CODE_LENGTH - 1);
    boxes.current[focusAt]?.focus();
    const joined = next.join("");
    if (joined.length === CODE_LENGTH) void verify(joined);
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  }

  if (!sent) {
    return (
      <form onSubmit={send} className="space-y-4" noValidate>
        {signup && (
          <div>
            <label htmlFor="signup-name" className="text-sm font-semibold">
              Your name
            </label>
            <input
              id="signup-name"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="Asha Nair"
              className="mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-[16px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-3 focus:ring-primary/15"
            />
          </div>
        )}
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
          {(
            [
              ["phone", "Mobile"],
              ["email", "Email"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              aria-pressed={mode === value}
              className={cn(
                "h-10 rounded-lg text-sm font-semibold transition-colors",
                mode === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "phone" ? (
          <div>
            <label htmlFor="mobile" className="text-sm font-semibold">
              Mobile number
            </label>
            <div
              className={cn(
                "mt-1.5 flex h-12 items-center overflow-hidden rounded-xl border bg-white transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15",
                error && "border-destructive",
              )}
            >
              <span className="flex h-full items-center border-r bg-muted/60 px-3.5 text-[15px] font-semibold text-muted-foreground">
                +91
              </span>
              <input
                id="mobile"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, "").slice(-10));
                  setError("");
                }}
                placeholder="98765 43210"
                className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[16px] font-medium tracking-wide outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "signin-error" : undefined}
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="email" className="text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value.trim());
                setError("");
              }}
              placeholder="you@email.com"
              className={cn(
                "mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-[16px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-3 focus:ring-primary/15",
                error && "border-destructive",
              )}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "signin-error" : undefined}
            />
          </div>
        )}

        {error && (
          <p id="signin-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-[15px] font-bold" disabled={!ready || busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : signup ? "Send code" : "Get OTP"}
        </Button>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="font-medium text-foreground underline-offset-2 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-medium text-foreground underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void verify();
      }}
      className="space-y-4"
      noValidate
    >
      <div>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError("");
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Change {mode === "phone" ? "number" : "email"}
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the 6-digit code sent to <span className="font-semibold text-foreground">{destination}</span>
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">One-time code</legend>
        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                boxes.current[index] = node;
              }}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={index === 0 ? CODE_LENGTH : 1}
              value={digit}
              onChange={(event) => fill(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={(event) => {
                event.preventDefault();
                fill(index, event.clipboardData.getData("text"));
              }}
              onFocus={(event) => event.target.select()}
              disabled={busy}
              aria-label={`Digit ${index + 1}`}
              className={cn(
                "size-12 min-w-0 flex-1 rounded-xl border bg-white text-center text-xl font-bold outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-60 sm:size-13",
                digit && "border-foreground/30",
                error && "border-destructive",
              )}
            />
          ))}
        </div>
      </fieldset>

      {devCode && (
        <p className="rounded-xl border border-dashed bg-muted/60 px-3 py-2 text-sm">
          Development code: <span className="font-mono font-semibold">{devCode}</span>
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl text-[15px] font-bold"
        disabled={code.length !== CODE_LENGTH || busy}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{" "}
        {wait > 0 ? (
          <span>Resend in 0:{String(wait).padStart(2, "0")}</span>
        ) : (
          <button type="button" onClick={() => void send()} className="font-semibold text-primary hover:underline" disabled={busy}>
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}
