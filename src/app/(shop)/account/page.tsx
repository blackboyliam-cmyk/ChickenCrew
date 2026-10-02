"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/site/states";
import { useShop } from "@/components/site/shop-context";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, ready, refreshUser } = useShop();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  if (!ready) return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  if (!user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Sign in to your account"
        body="See your orders, saved addresses and coupons."
        actionLabel="Sign in"
        href="/login?next=/account"
      />
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/profile", { method: "PUT", body: { name, email } });
      await refreshUser();
      setMessage({ ok: true, text: "Profile saved." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof ApiClientError ? error.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-2xl border bg-card p-5 md:p-6">
      <h2 className="text-lg font-bold">Profile</h2>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">
            Name
          </Label>
          <Input id="name" autoComplete="name" className="mt-1 h-11" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">
            Mobile number
          </Label>
          <Input id="phone" className="mt-1 h-11 bg-muted" value={user.phone} readOnly aria-describedby="phone-note" />
          <p id="phone-note" className="mt-1 text-xs text-muted-foreground">
            Used to log in. It can&apos;t be changed here.
          </p>
        </div>
        <div>
          <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
            Email (optional)
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1 h-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>
      {message && (
        <p className={cn("mt-4 text-sm", message.ok ? "text-success" : "text-destructive")} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Save profile
      </button>
    </form>
  );
}
