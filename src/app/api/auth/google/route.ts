import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { setOauthState } from "@/lib/auth";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google_off", url.origin));
  const raw = url.searchParams.get("next") || "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  const state = randomBytes(16).toString("base64url");
  await setOauthState(state, next);
  return NextResponse.redirect(googleAuthUrl(url.origin, state));
}
