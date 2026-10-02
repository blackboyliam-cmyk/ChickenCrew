import { cartCookie, hashOtp, setCartCookie, setSessionCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { consumeOtp, mergeCarts, publicUser, upsertUser } from "@/lib/store";
import { isIndianMobile, normalizeMobile } from "@/lib/validators";

export const POST = handle(async (req) => {
  rateLimit(`otp-verify:${clientIp(req)}`, 20, 15 * 60 * 1000);
  const body = await readJson(req);
  const phone = normalizeMobile(String(body.phone || ""));
  const code = String(body.code || "").trim();
  if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid Indian mobile number.");
  if (!/^\d{6}$/.test(code)) throw new ApiError(400, "Enter the 6-digit code.");
  consumeOtp(phone, hashOtp(phone, code));
  const user = upsertUser(phone);
  await setSessionCookie(user.id);
  const cartId = mergeCarts(await cartCookie(), user.id);
  await setCartCookie(cartId);
  return { user: publicUser(user) };
});
