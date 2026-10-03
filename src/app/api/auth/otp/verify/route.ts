import { cartCookie, hashOtp, setCartCookie, setSessionCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { consumeOtp, mergeCarts, publicUser, upsertEmailUser, upsertUser } from "@/lib/store";
import { cleanText, isEmail, isIndianMobile, normalizeMobile } from "@/lib/validators";

export const POST = handle(async (req) => {
  rateLimit(`otp-verify:${clientIp(req)}`, 20, 15 * 60 * 1000);
  const body = await readJson(req);
  const email = cleanText(body.email, 120).toLowerCase();
  const phone = normalizeMobile(String(body.phone || ""));
  const code = String(body.code || "").trim();
  const name = cleanText(body.name, 80);
  if (name && name.length < 2) throw new ApiError(400, "Enter your name.");
  if (!/^\d{6}$/.test(code)) throw new ApiError(400, "Enter the 6-digit code.");

  if (email) {
    if (!isEmail(email)) throw new ApiError(400, "Enter a valid email address.");
    consumeOtp(email, hashOtp(email, code));
    const user = upsertEmailUser(email, name);
    await setSessionCookie(user.id);
    const cartId = mergeCarts(await cartCookie(), user.id);
    await setCartCookie(cartId);
    return { user: publicUser(user) };
  }

  if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid Indian mobile number.");
  consumeOtp(phone, hashOtp(phone, code));
  const user = upsertUser(phone, name);
  await setSessionCookie(user.id);
  const cartId = mergeCarts(await cartCookie(), user.id);
  await setCartCookie(cartId);
  return { user: publicUser(user) };
});
