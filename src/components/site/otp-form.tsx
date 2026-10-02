"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api-client";
import { useShop } from "@/components/site/shop-context";

export function OtpForm({ onDone }: { onDone?: () => void }) {
  const { refreshUser } = useShop();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ devCode?: string }>("/api/auth/otp/send", { method: "POST", body: { phone } });
      setSent(true);
      setDevCode(data.devCode || "");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/otp/verify", { method: "POST", body: { phone, code } });
      await refreshUser();
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <Input id="mobile" inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile number" required />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>Send OTP</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <div>
            <Label htmlFor="otp">OTP</Label>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" required />
          </div>
          {devCode && <p className="rounded-xl bg-muted px-3 py-2 text-sm">Development code: {devCode}</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Log in</Button>
            <Button type="button" variant="outline" onClick={() => setSent(false)}>Change number</Button>
          </div>
        </form>
      )}
    </div>
  );
}
