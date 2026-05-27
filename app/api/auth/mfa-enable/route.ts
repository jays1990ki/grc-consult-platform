/**
 * POST /api/auth/mfa-enable
 * Confirms the TOTP setup: verifies the user's first code, then saves
 * the secret and sets mfa_enabled = 1.
 * Body: { secret: string, code: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { verifyMfaToken } from "@/lib/mfa";
import { writeLog, getClientIP } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body   = await req.json().catch(() => ({}));
    const secret = sanitizeText(body?.secret, 64).trim();
    const code   = sanitizeText(body?.code,   10).replace(/\s/g, "");

    if (!secret || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify the code before saving
    if (!verifyMfaToken(code, secret)) {
      return NextResponse.json({ error: "Incorrect code — please try again." }, { status: 400 });
    }

    // Save secret and enable MFA
    db.update(schema.users)
      .set({ mfaEnabled: 1, mfaSecret: secret, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, session.id))
      .run();

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "security",
      details: `MFA enabled — IP: ${getClientIP(req)}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[mfa-enable] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
