/**
 * GET /api/auth/mfa-setup
 * Generates a fresh TOTP secret + QR code for the logged-in user.
 * The secret is returned to the client so it can be confirmed via
 * /api/auth/mfa-enable before being persisted.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generateMfaSecret, getMfaOtpauthUrl } from "@/lib/mfa";
import QRCode from "qrcode";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret     = generateMfaSecret();
  const otpauthUrl = getMfaOtpauthUrl(session.email, secret);
  const qrDataUrl  = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 });

  return NextResponse.json({ secret, qrDataUrl });
}
