import { adminLoginOk, setAdminCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  rateLimit(`admin:${clientIp(req)}`, 8, 15 * 60 * 1000);
  const body = await readJson(req);
  const email = cleanText(body.email, 120).toLowerCase();
  const password = String(body.password || "");
  const remember = Boolean(body.remember);
  if (!adminLoginOk(email, password)) throw new ApiError(401, "That email or password is not correct.");
  await setAdminCookie(remember);
  return { ok: true };
});
