/**
 * POST /api/auth/mfa-verify
 * Second step of login: verify TOTP code and create a full session.
 * Requires me_mfa_pending cookie (set by /api/auth/login when MFA is on).
 */
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getMfaPending, clearMfaPending } from "@/lib/auth/mfa-session";
import { createSession } from "@/lib/auth/session";
import { verifyMfaToken } from "@/lib/mfa";
import { writeLog, getClientIP } from "@/lib/audit";
import { mfaLimiter } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  // Rate-limit: 5 attempts per IP per 15 min
  const rl = mfaLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 900) } }
    );
  }

  // Validate pending cookie
  const pending = await getMfaPending();
  if (!pending) {
    return NextResponse.json(
      { error: "Session expired. Please login again." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code = sanitizeText(body?.code, 10).replace(/\s/g, "");

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter a 6-digit code" }, { status: 400 });
    }

    // Fetch user's MFA secret
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, pending.id))
      .get();

    if (!user || !user.mfaSecret || user.mfaEnabled !== 1) {
      await clearMfaPending();
      return NextResponse.json({ error: "MFA not configured" }, { status: 400 });
    }

    // Verify TOTP
    const valid = verifyMfaToken(code, user.mfaSecret);
    if (!valid) {
      writeLog({
        userId: user.id, userName: user.name, userEmail: user.email,
        action: "login", module: "auth",
        details: `MFA FAILED — wrong code — IP: ${ip}`,
        ipAddress: ip,
      });
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 401 });
    }

    // Success — promote to full session
    mfaLimiter.reset(ip);
    await clearMfaPending();
    await createSession({ id: user.id, email: user.email, role: user.role, name: user.name });

    writeLog({
      userId: user.id, userName: user.name, userEmail: user.email,
      action: "login", module: "auth",
      details: `MFA verified — login complete — role: ${user.role} — IP: ${ip}`,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[mfa-verify] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
