import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION = "cc_session";
const ADMIN = "cc_admin";
const CART = "cc_cart";

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
