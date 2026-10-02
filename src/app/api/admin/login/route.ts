import { adminPasswordOk, setAdminCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";

export const POST = handle(async (req) => {
  rateLimit(`admin:${clientIp(req)}`, 8, 15 * 60 * 1000);
  const body = await readJson(req);
  if (!adminPasswordOk(String(body.password || ""))) throw new ApiError(401, "That password is not correct.");
  await setAdminCookie();
  return { ok: true };
});
