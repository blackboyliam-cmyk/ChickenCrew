export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}

export function isPincode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value);
}

export function isEmail(value: string): boolean {
  return value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function requireText(value: unknown, label: string, max: number, min = 1): string {
  const text = cleanText(value, max);
  if (text.length < min) {
    throw new Error(`${label} is required.`);
  }
  return text;
}

export function asPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function asNonNegativeInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}
