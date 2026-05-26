import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/** PATCH /api/admin/frameworks/[id]/requirements/[rid] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fwId = Number(params.id);
  const rid  = Number(params.rid);
  const db   = getDb();
  try {
    const existing = db.prepare(
      "SELECT requirement_id FROM gap_requirements WHERE id = ? AND framework_id = ?"
    ).get(rid, fwId) as any;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body    = await req.json() as Record<string, unknown>;
    const allowed = ["requirement_id", "requirement_name", "domain", "description", "guidance", "sort_order"];
    const sets: string[] = [];
    const vals: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    vals.push(rid, fwId);
    db.prepare(`UPDATE gap_requirements SET ${sets.join(", ")} WHERE id = ? AND framework_id = ?`).run(...vals);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "gap_requirements",
      targetId: rid, targetName: existing.requirement_id,
      details: `Requirement updated: ${existing.requirement_id} | Fields: ${Object.keys(body).join(", ")}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Requirement ID already exists in this framework" }, { status: 409 });
    }
    throw e;
  } finally { db.close(); }
}

/** DELETE /api/admin/frameworks/[id]/requirements/[rid] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fwId = Number(params.id);
  const rid  = Number(params.rid);
  const db   = getDb();
  try {
    const req2 = db.prepare(
      "SELECT requirement_id FROM gap_requirements WHERE id = ? AND framework_id = ?"
    ).get(rid, fwId) as any;
    if (!req2) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM gap_requirements WHERE id = ? AND framework_id = ?").run(rid, fwId);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "delete", module: "gap_requirements",
      targetId: rid, targetName: req2.requirement_id,
      details: `Requirement deleted: ${req2.requirement_id} | Framework ID: ${fwId}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
