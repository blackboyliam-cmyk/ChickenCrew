import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import { withDb } from "./store";

const buckets = new Map<string, { n: number; reset: number }>();

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  bucket.n += 1;
  if (bucket.n > limit) {
    throw new ApiError(429, "Too many attempts. Please wait and try again.");
  }
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) throw new ApiError(403, "Request blocked.");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Request blocked.");
  }
  if (originHost !== host) throw new ApiError(403, "Request blocked.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<unknown>;

export function handle(fn: Handler, options?: { origin?: boolean }) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const checkOrigin = options?.origin !== false && !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (checkOrigin) assertSameOrigin(req);
      const body = ["GET", "HEAD"].includes(req.method) ? null : await req.arrayBuffer();
      const headers = Array.from(req.headers.entries());
      const result = await withDb(() => fn(new Request(req.url, { method: req.method, headers, body }), ctx));
      if (result instanceof Response) return result;
      return json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: error.message, code: error.code, details: error.details }, error.status);
      }
      console.error(error);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

export async function readJson(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "That request could not be read.");
  }
}
