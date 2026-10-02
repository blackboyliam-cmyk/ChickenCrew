import { setRiderCookie } from "@/lib/auth";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { riderLogin } from "@/lib/store";

export const POST = handle(async (req) => {
  rateLimit(`rider-login:${clientIp(req)}`, 10, 15 * 60 * 1000);
  const body = await readJson(req);
  const rider = riderLogin(String(body.phone || ""), String(body.pin || ""));
  await setRiderCookie(rider.id);
  return { rider };
});
