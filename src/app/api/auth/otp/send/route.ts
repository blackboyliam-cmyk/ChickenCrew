import { hashOtp, newOtpCode } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { saveOtp } from "@/lib/store";
import { isIndianMobile, normalizeMobile } from "@/lib/validators";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`otp-ip:${ip}`, 10, 15 * 60 * 1000);
  const body = await readJson(req);
  const phone = normalizeMobile(String(body.phone || ""));
  if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid Indian mobile number.");
  rateLimit(`otp-phone:${phone}`, 5, 15 * 60 * 1000);
  const code = newOtpCode();
  saveOtp(phone, hashOtp(phone, code));
  const dev = process.env.NODE_ENV !== "production" && process.env.OTP_DEV_MODE === "true";
  return { ok: true, devCode: dev ? code : undefined };
});
