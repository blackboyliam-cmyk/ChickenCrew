import { cartCookie, ownerLoginOk, passwordLoginConfigured, reviewLoginOk, setAdminCookie, setCartCookie, setSessionCookie } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { mergeCarts, publicUser, upsertEmailUser } from "@/lib/store";
import { cleanText, isEmail } from "@/lib/validators";

export const POST = handle(async (req) => {
  rateLimit(`password-login:${clientIp(req)}`, 12, 15 * 60 * 1000);
  if (!passwordLoginConfigured()) throw new ApiError(503, "Password sign-in is not available.");
  const body = await readJson(req);
  const email = cleanText(body.email, 120).toLowerCase();
  const password = String(body.password || "");
  const remember = Boolean(body.remember);
  if (!isEmail(email)) throw new ApiError(400, "Enter a valid email address.");
  if (!password) throw new ApiError(400, "Enter your password.");

  const owner = ownerLoginOk(email, password);
  const reviewer = !owner && reviewLoginOk(email, password);
  if (!owner && !reviewer) throw new ApiError(401, "That email or password is not correct.");

  const user = upsertEmailUser(email);
  await setSessionCookie(user.id, remember);
  if (owner) await setAdminCookie(remember);
  const cartId = mergeCarts(await cartCookie(), user.id);
  await setCartCookie(cartId);
  return { user: publicUser(user), admin: owner };
});
