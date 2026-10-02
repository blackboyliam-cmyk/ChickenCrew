import "server-only";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Swaps the one-time code for the user's profile. The ID token comes straight from Google's
 * token endpoint over HTTPS with our client secret, so its claims are checked but its signature
 * does not need verifying.
 */
export async function exchangeGoogleCode(code: string, origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!response.ok || !data.id_token) throw new Error(`Google token exchange failed: ${data.error || response.status}`);
  const claims = JSON.parse(Buffer.from(data.id_token.split(".")[1] || "", "base64url").toString()) as {
    sub?: string;
    aud?: string;
    iss?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!claims.sub || claims.aud !== clientId || !issuerOk || !claims.exp || claims.exp * 1000 < Date.now()) {
    throw new Error("Google sign-in returned an invalid token.");
  }
  if (!claims.email || !verified) throw new Error("This Google account has no verified email.");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name || "" };
}
