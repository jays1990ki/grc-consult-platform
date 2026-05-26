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
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** PATCH /api/bia/processes/[id] */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const id  = Number(params.id);
  const db  = getDb();
  try {
    const body = await req.json() as Record<string, unknown>;
    const now  = new Date().toISOString();

    const allowed = [
      "process_name", "process_owner", "department", "related_it_system",
      "related_assets", "priority_level", "mtpd", "rto", "rpo", "status",
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = ?`);
        vals.push(key === "related_assets" ? JSON.stringify(body[key]) : body[key]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    sets.push("updated_at = ?");
    vals.push(now, id, org);

    db.prepare(`
      UPDATE business_processes SET ${sets.join(", ")}
      WHERE id = ? AND organization_id = ?
    `).run(...vals);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "bia_processes",
      targetId: id,
      details: `BIA process updated: ID ${id} | Fields: ${Object.keys(body).join(", ")} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}

/** DELETE /api/bia/processes/[id] */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const id  = Number(params.id);
  const db  = getDb();
  try {
    const proc = db.prepare(
      "SELECT process_name FROM business_processes WHERE id = ? AND organization_id = ?"
    ).get(id, org) as any;

    if (!proc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare(
      "DELETE FROM business_processes WHERE id = ? AND organization_id = ?"
    ).run(id, org);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "delete", module: "bia_processes",
      targetId: id, targetName: proc.process_name,
      details: `BIA process deleted: ${proc.process_name} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
