import { hashOtp, newOtpCode } from "@/lib/auth";
import { emailConfigured, sendOtpEmail } from "@/lib/email";
import { ApiError } from "@/lib/errors";
import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { sendOtpSms, smsConfigured } from "@/lib/sms";
import { afterSave, saveOtp } from "@/lib/store";
import { cleanText, isEmail, isIndianMobile, normalizeMobile } from "@/lib/validators";

function devMode() {
  return process.env.NODE_ENV !== "production" && process.env.OTP_DEV_MODE === "true";
}

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`otp-ip:${ip}`, 10, 15 * 60 * 1000);
  const body = await readJson(req);
  const email = cleanText(body.email, 120).toLowerCase();
  const phone = normalizeMobile(String(body.phone || ""));
  const dev = devMode();
  const code = newOtpCode();

  if (email) {
    if (!isEmail(email)) throw new ApiError(400, "Enter a valid email address.");
    rateLimit(`otp-email:${email}`, 5, 15 * 60 * 1000);
    if (!dev && !emailConfigured()) {
      throw new ApiError(503, "Email login isn't set up yet. Use your mobile number.");
    }
    saveOtp(email, hashOtp(email, code));
    if (!dev) afterSave(() => sendOtpEmail(email, code));
    return { ok: true, devCode: dev ? code : undefined };
  }

  if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid Indian mobile number.");
  rateLimit(`otp-phone:${phone}`, 5, 15 * 60 * 1000);
  if (!dev && !smsConfigured()) {
    throw new ApiError(503, "SMS login isn't set up yet. Please call the shop to order.");
  }
  saveOtp(phone, hashOtp(phone, code));
  if (!dev) afterSave(() => sendOtpSms(phone, code));
  return { ok: true, devCode: dev ? code : undefined };
});
