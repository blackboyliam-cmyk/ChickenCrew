import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPin(pin: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !pin) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pin, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
