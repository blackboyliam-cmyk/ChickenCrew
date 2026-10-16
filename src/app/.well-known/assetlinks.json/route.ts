import { NextResponse } from "next/server";

/**
 * Digital Asset Links — tells Android this website belongs to the Play Store app.
 * After you create the upload keystore in Android Studio / Play Console, replace
 * SHA256_FINGERPRINT_PLACEHOLDER with the SHA-256 fingerprint (colons optional).
 * Until then the file is empty so browsers ignore it.
 */
const PACKAGE = "shop.karthikachickencentre.app";
const FINGERPRINTS = (process.env.ANDROID_SHA256_FINGERPRINTS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export function GET() {
  if (!FINGERPRINTS.length) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE,
          sha256_cert_fingerprints: FINGERPRINTS,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/json" } },
  );
}
