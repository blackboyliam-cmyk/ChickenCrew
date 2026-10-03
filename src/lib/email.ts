import "server-only";

import { ApiError } from "./errors";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends a 6-digit sign-in code through Resend. */
export async function sendOtpEmail(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ApiError(503, "Email login isn't set up yet. Use your mobile number.");
  const from = process.env.EMAIL_FROM || "ChickenCrew <onboarding@resend.dev>";
  let body = "";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: `${code} is your ChickenCrew sign-in code`,
        text: `${code} is your ChickenCrew sign-in code. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    console.error("Resend request failed", error, body.slice(0, 200));
    throw new ApiError(502, "We couldn't send the code right now. Please try again in a minute.");
  }
}
