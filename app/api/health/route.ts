/**
 * GET /api/health
 * A05: Simple liveness check — no sensitive info exposed.
 * Returns only { status: "ok" } — no version, env, DB details.
 * Listed in PUBLIC_PATHS in middleware so it bypasses auth.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
