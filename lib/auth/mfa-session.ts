/**
 * lib/auth/mfa-session.ts
 *
 * After the user's password is verified but before the TOTP code is
 * checked, we store a short-lived (5 min) signed JWT in the
 * `me_mfa_pending` cookie.  Only once the TOTP is confirmed do we
 * upgrade to a full `me_session` cookie.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mecorp-admin-secret-key-2024-change-in-production"
);
const COOKIE = "me_mfa_pending";

interface MfaPendingPayload {
  id:    number;
  email: string;
  role:  string;
  name:  string;
}

export async function createMfaPending(user: MfaPendingPayload) {
  const token = await new SignJWT({ ...user, _type: "mfa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(SECRET);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   300, // 5 minutes
    path:     "/",
  });
}

export async function getMfaPending(): Promise<MfaPendingPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload._type !== "mfa_pending") return null;
    return payload as unknown as MfaPendingPayload;
  } catch {
    return null;
  }
}

export async function clearMfaPending() {
  cookies().delete(COOKIE);
}
