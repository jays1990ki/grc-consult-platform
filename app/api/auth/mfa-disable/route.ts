/**
 * POST /api/auth/mfa-disable
 * Disables MFA for the logged-in user after re-confirming their password.
 * Body: { password: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body     = await req.json().catch(() => ({}));
    const password = sanitizeText(body?.password, 1000);

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    // Re-verify password before disabling MFA
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.id))
      .get();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Clear MFA
    db.update(schema.users)
      .set({ mfaEnabled: 0, mfaSecret: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, session.id))
      .run();

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "security",
      details: `MFA disabled — IP: ${getClientIP(req)}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[mfa-disable] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
