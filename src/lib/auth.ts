import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION = "cc_session";
const ADMIN = "cc_admin";
const CART = "cc_cart";
const RIDER = "cc_rider";
const OAUTH = "cc_oauth";

function secret() {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

function baseCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(SESSION, sign({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 }), baseCookie(60 * 60 * 24 * 30));
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION);
}

export async function readUserId(): Promise<string | null> {
  const jar = await cookies();
  const session = verifyToken<{ uid: string; exp: number }>(jar.get(SESSION)?.value);
  if (!session || session.exp < Date.now()) return null;
  return session.uid;
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(ADMIN, sign({ role: "admin", exp: Date.now() + 1000 * 60 * 60 * 12 }), baseCookie(60 * 60 * 12));
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(ADMIN);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const session = verifyToken<{ role: string; exp: number }>(jar.get(ADMIN)?.value);
  return Boolean(session && session.role === "admin" && session.exp > Date.now());
}

export async function setRiderCookie(riderId: string) {
  const jar = await cookies();
  jar.set(RIDER, sign({ rid: riderId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 }), baseCookie(60 * 60 * 24 * 30));
}

export async function clearRiderCookie() {
  const jar = await cookies();
  jar.delete(RIDER);
}

export async function readRiderId(): Promise<string | null> {
  const jar = await cookies();
  const session = verifyToken<{ rid: string; exp: number }>(jar.get(RIDER)?.value);
  if (!session || session.exp < Date.now()) return null;
  return session.rid;
}

/** Remembers the Google sign-in attempt so the callback can reject forged responses. */
export async function setOauthState(state: string, next: string) {
  const jar = await cookies();
  jar.set(OAUTH, sign({ state, next, exp: Date.now() + 10 * 60 * 1000 }), baseCookie(10 * 60));
}

export async function takeOauthState(): Promise<{ state: string; next: string } | null> {
  const jar = await cookies();
  const saved = verifyToken<{ state: string; next: string; exp: number }>(jar.get(OAUTH)?.value);
  jar.delete(OAUTH);
  if (!saved || saved.exp < Date.now()) return null;
  return { state: saved.state, next: saved.next };
}

export async function cartCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART)?.value || null;
}

export async function setCartCookie(id: string) {
  const jar = await cookies();
  jar.set(CART, id, baseCookie(60 * 60 * 24 * 60));
}

export function hashOtp(phone: string, code: string) {
  return createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
}

export function newOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function adminPasswordOk(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const left = Buffer.from(password);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
