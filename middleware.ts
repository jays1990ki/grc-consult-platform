/**
 * Central auth middleware — OWASP A01/A07
 *
 * Rules:
 *  - Public paths bypass all checks
 *  - /api/* routes that are unauthenticated → 401 JSON (never redirect)
 *  - /api/admin/* routes with non-admin role → 403 JSON
 *  - Page routes that are unauthenticated → redirect to login
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mecorp-admin-secret-key-2024-change-in-production"
);

// Paths that require NO authentication
const PUBLIC_PATHS = [
  "/login",
  "/portal/login",
  "/api/auth/login",
  "/api/auth/mfa-verify",  // TOTP verification (uses me_mfa_pending cookie, not session)
  "/api/health",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function jsonError(message: string, status: number): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get("me_session")?.value;
  const isApi    = pathname.startsWith("/api/");
  const isPortal = pathname.startsWith("/portal");

  // ── No token ──────────────────────────────────────────────────────────────
  if (!token) {
    if (isApi) return jsonError("Unauthorized", 401);
    return NextResponse.redirect(
      new URL(isPortal ? "/portal/login" : "/login", request.url)
    );
  }

  // ── Verify token ──────────────────────────────────────────────────────────
  let payload: { id: number; email: string; role: string; name: string };
  try {
    const result = await jwtVerify(token, SECRET);
    payload = result.payload as typeof payload;
  } catch {
    if (isApi) return jsonError("Unauthorized — session expired", 401);
    return NextResponse.redirect(
      new URL(isPortal ? "/portal/login" : "/login", request.url)
    );
  }

  // ── Admin-only API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/") && payload.role !== "admin") {
    return jsonError("Forbidden — admin access required", 403);
  }

  // ── Admin-only page routes ────────────────────────────────────────────────
  if (pathname.startsWith("/admin/") && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude: Next.js internals, favicon, uploaded files,
  // and any path that ends with a static file extension (.png, .jpg, etc.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|otf|css|js|map)$).*)",
  ],
};
