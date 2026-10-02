"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OtpForm } from "@/components/site/otp-form";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use your mobile number. We will send a one-time code.</p>
      <div className="mt-6">
        <OtpForm onDone={() => router.push(next)} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
