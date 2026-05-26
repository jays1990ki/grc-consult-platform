import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session) {
    writeLog({
      userId:    session.id,
      userName:  session.name,
      userEmail: session.email,
      action:    "logout",
      module:    "auth",
      details:   "User logged out",
      ipAddress: getClientIP(req),
    });
  }

  await deleteSession();
  return NextResponse.json({ ok: true });
}
