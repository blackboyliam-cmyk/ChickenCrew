"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Clock3, MapPin, RotateCcw } from "lucide-react";
import { GoogleButton } from "@/components/site/google-button";
import { Mark } from "@/components/site/logo";
import { OtpForm } from "@/components/site/otp-form";
import { PasswordSignIn } from "@/components/site/password-sign-in";
import { cn } from "@/lib/utils";

const PERKS = [
  { icon: Clock3, text: "Track every order and delivery slot" },
  { icon: MapPin, text: "Save addresses for one-tap checkout" },
  { icon: RotateCcw, text: "Reorder your usual cuts in seconds" },
];

function Divider({ label }: { label: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t" />
      </div>
      <span className="relative mx-auto block w-fit bg-white px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") || "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  const error = params.get("error");
  const signup = params.get("mode") === "signup";

  function setMode(create: boolean) {
    const query = new URLSearchParams();
    if (next !== "/account") query.set("next", next);
    if (create) query.set("mode", "signup");
    const qs = query.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }

  return (
    <div className="flex justify-center px-0 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-4 md:py-12 md:pb-12">
      <div className="grid w-full max-w-[960px] overflow-hidden bg-white md:rounded-3xl md:border md:shadow-card md:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden min-h-[520px] flex-col justify-end overflow-hidden bg-charcoal p-8 text-white md:flex">
          <Image src="/media/hero.jpg" alt="" fill sizes="480px" className="object-cover opacity-40" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/10" />
          <div className="relative">
            <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
              Fresh chicken,
              <br />
              cut when you order.
            </h2>
            <ul className="mt-6 space-y-3">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-10 sm:py-10 md:py-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-5 flex items-center gap-3 md:hidden">
              <Mark className="size-11" />
              <div>
                <p className="font-[family-name:var(--font-plus-jakarta)] text-base font-extrabold tracking-tight">
                  Chicken<span className="text-primary">Crew</span>
                </p>
                <p className="text-xs text-muted-foreground">{signup ? "Create your account" : "Welcome back"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
              {(
                [
                  [false, "Sign in"],
                  [true, "Create account"],
                ] as const
              ).map(([create, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMode(create)}
                  aria-pressed={signup === create}
                  className={cn(
                    "h-11 rounded-xl text-sm font-semibold transition-colors",
                    signup === create ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <h1 className="mt-6 text-[26px] font-extrabold tracking-tight md:text-[28px]">
              {signup ? "Create account" : "Sign in"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {signup
                ? "Save addresses, track orders, and checkout faster next time."
                : "Use your email and password, Google, or a one-time code on your phone."}
            </p>

            {error && (
              <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error === "google_off"
                  ? "Google sign-in isn't set up yet. Use your mobile number or email."
                  : "Google sign-in didn't finish. Please try again."}
              </p>
            )}

            <div className="mt-6 space-y-0">
              {!signup && (
                <>
                  <PasswordSignIn onDone={() => router.push(next)} />
                  <Divider label="or" />
                </>
              )}

              <GoogleButton next={next} />

              <Divider label={signup ? "or with mobile" : "or mobile OTP"} />

              <OtpForm
                key={signup ? "signup" : "signin"}
                signup={signup}
                submitLabel={signup ? "Create account" : "Sign in"}
                onDone={() => router.push(next)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
