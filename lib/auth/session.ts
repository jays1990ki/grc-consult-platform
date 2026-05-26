import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mecorp-admin-secret-key-2024-change-in-production"
);
const COOKIE = "me_session";

export async function createSession(payload: { id: number; email: string; role: string; name: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
  // A02: httpOnly prevents JS access; secure enforced in prod; strict sameSite blocks CSRF
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   60 * 60 * 8, // 8 hours — A07
    path:     "/",
  });
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: number; email: string; role: string; name: string };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  cookies().delete(COOKIE);
}
