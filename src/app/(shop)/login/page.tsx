"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Clock3, MapPin, RotateCcw } from "lucide-react";
import { OtpForm } from "@/components/site/otp-form";

const PERKS = [
  { icon: Clock3, text: "Track every order and delivery slot" },
  { icon: MapPin, text: "Save addresses for one-tap checkout" },
  { icon: RotateCcw, text: "Reorder your usual cuts in seconds" },
];

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") || "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  return (
    <div className="flex justify-center py-6 md:py-12">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-3xl border bg-white shadow-card md:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden min-h-[520px] flex-col justify-end overflow-hidden bg-charcoal p-8 text-white md:flex">
          <Image src="/media/hero.jpg" alt="" fill sizes="480px" className="object-cover opacity-40" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/10" />
          <div className="relative">
            <h2 className="text-[28px] font-extrabold leading-tight tracking-tight">
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

        <section className="px-5 py-8 sm:px-10 md:py-12">
          <div className="mx-auto max-w-sm">
            <h1 className="text-[28px] font-extrabold tracking-tight">Sign in</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              New here? Just enter your number — we&apos;ll create your account.
            </p>
            <div className="mt-7">
              <OtpForm onDone={() => router.push(next)} />
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
