/**
 * POST /api/auth/login
 * OWASP A04: Rate limiting (5 attempts / IP / 15 min)
 * OWASP A07: Log ALL attempts (success + failure) with IP
 * OWASP A03: Sanitize inputs before use
 */
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { loginLimiter } from "@/lib/rate-limit";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  // ── A04: Rate limit by IP ──────────────────────────────────────────────────
  const rl = loginLimiter.check(ip);
  if (!rl.allowed) {
    // Log the rate-limit breach attempt
    writeLog({
      userName:  "unknown",
      userEmail: "unknown",
      action:    "login",
      module:    "auth",
      details:   `Login blocked — rate limit exceeded (${ip})`,
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in 15 minutes." },
      {
        status: 429,
        headers: {
          "Retry-After":          String(rl.retryAfter ?? 900),
          "X-RateLimit-Limit":    "5",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // ── A03: Sanitize inputs ───────────────────────────────────────────────
    const email    = sanitizeEmail(body?.email);
    const password = sanitizeText(body?.password, 1000);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // ── Lookup user ───────────────────────────────────────────────────────
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    // Always run bcrypt to prevent timing attacks (even if user not found)
    const hashToCompare = user?.password ?? "$2b$12$invalidhashpadding000000000000000000000000000000000000";
    const valid = await bcrypt.compare(password, hashToCompare);

    // ── A07: Log failure ──────────────────────────────────────────────────
    if (!user || user.status === "inactive" || !valid) {
      writeLog({
        userName:  email,
        userEmail: email,
        action:    "login",
        module:    "auth",
        details:   `Login FAILED — ${!user ? "user not found" : !valid ? "wrong password" : "account inactive"} — IP: ${ip}`,
        ipAddress: ip,
      });
      // Generic message — never reveal whether user exists (A07)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── A04: Reset rate limit on successful login ─────────────────────────
    loginLimiter.reset(ip);

    await createSession({
      id:    user.id,
      email: user.email,
      role:  user.role,
      name:  user.name,
    });

    // ── A07: Log success ──────────────────────────────────────────────────
    writeLog({
      userId:    user.id,
      userName:  user.name,
      userEmail: user.email,
      action:    "login",
      module:    "auth",
      details:   `Login successful — role: ${user.role} — IP: ${ip}`,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    // A05: Log error server-side only — never expose stack traces to client
    console.error("[login] Unexpected error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
