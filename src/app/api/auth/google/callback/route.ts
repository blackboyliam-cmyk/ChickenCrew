import { NextResponse } from "next/server";
import { cartCookie, setCartCookie, setSessionCookie, takeOauthState } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/google";
import { mergeCarts, upsertGoogleUser, withDb } from "@/lib/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = () => NextResponse.redirect(new URL("/login?error=google", url.origin));
  const saved = await takeOauthState();
  const code = url.searchParams.get("code");
  if (!saved || !code || url.searchParams.get("state") !== saved.state) return fail();

  let profile: Awaited<ReturnType<typeof exchangeGoogleCode>>;
  try {
    profile = await exchangeGoogleCode(code, url.origin);
  } catch (error) {
    console.error(error);
    return fail();
  }

  const guestCart = await cartCookie();
  const { userId, cartId } = await withDb(() => {
    const user = upsertGoogleUser(profile);
    return { userId: user.id, cartId: mergeCarts(guestCart, user.id) };
  });
  await setSessionCookie(userId);
  await setCartCookie(cartId);
  return NextResponse.redirect(new URL(saved.next, url.origin));
}
