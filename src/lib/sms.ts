import "server-only";

import { ApiError } from "./errors";

const RENFLAIR_URL = "https://sms.renflair.in/V1.php";

export function smsConfigured() {
  return Boolean(process.env.RENFLAIR_API_KEY);
}

/** Sends "<code> is your verification code for <your domain>" through Renflair. */
export async function sendOtpSms(phone: string, code: string) {
  const key = process.env.RENFLAIR_API_KEY;
  if (!key) throw new ApiError(503, "SMS login isn't set up yet. Please call the shop to order.");
  const url = `${RENFLAIR_URL}?${new URLSearchParams({ API: key, PHONE: phone, OTP: code })}`;
  let body = "";
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    console.error("Renflair request failed", error, body.slice(0, 200));
    throw new ApiError(502, "We couldn't send the code right now. Please try again in a minute.");
  }
  let status = "";
  try {
    const data = JSON.parse(body) as { status?: unknown; return?: unknown };
    status = String(data.status ?? data.return ?? "").toLowerCase();
  } catch {
    // Non-JSON replies are treated by their text below.
  }
  if (/fail|error|invalid|insufficient|false/.test(status || body.toLowerCase())) {
    console.error("Renflair rejected the SMS", body.slice(0, 200));
    throw new ApiError(502, "We couldn't send the code right now. Please try again in a minute.");
  }
}
