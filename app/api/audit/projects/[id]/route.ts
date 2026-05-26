import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** GET /api/audit/projects/[id] */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = orgId(req);
  const id  = Number(params.id);
  const db  = getDb();
  try {
    const project = db.prepare(
      "SELECT * FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(id, org);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } finally { db.close(); }
}

/** PATCH /api/audit/projects/[id] */
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
      "project_name", "framework", "auditor_name", "client_name",
      "start_date", "end_date", "status",
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    sets.push("updated_at = ?");
    vals.push(now, id, org);

    db.prepare(`
      UPDATE audit_projects SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?
    `).run(...vals);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "audit_projects",
      targetId: id,
      details: `Audit project updated: ID ${id} | Fields: ${Object.keys(body).join(", ")} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}

/** DELETE /api/audit/projects/[id] */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const id  = Number(params.id);
  const db  = getDb();
  try {
    const proj = db.prepare(
      "SELECT project_name FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(id, org) as any;
    if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM audit_projects WHERE id = ? AND organization_id = ?").run(id, org);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "delete", module: "audit_projects",
      targetId: id, targetName: proj.project_name,
      details: `Audit project deleted: ${proj.project_name} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
