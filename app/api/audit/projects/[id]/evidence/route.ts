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

/** GET /api/audit/projects/[id]/evidence */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = orgId(req);
  const pid = Number(params.id);
  const db  = getDb();
  try {
    const rows = db.prepare(`
      SELECT er.*,
             COUNT(ef.id) AS file_count,
             MAX(ef.version_number) AS latest_version
      FROM evidence_requests er
      LEFT JOIN evidence_files ef ON ef.evidence_request_id = er.id
      WHERE er.audit_project_id = ? AND er.organization_id = ?
      GROUP BY er.id
      ORDER BY er.created_at ASC
    `).all(pid, org);
    return NextResponse.json(rows);
  } finally { db.close(); }
}

/** POST /api/audit/projects/[id]/evidence — create evidence request */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const pid = Number(params.id);
  const db  = getDb();
  try {
    // Verify project belongs to org
    const proj = db.prepare(
      "SELECT id FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(pid, org);
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json() as {
      evidence_name: string;
      evidence_description?: string;
      assigned_owner?: string;
      due_date?: string;
      requirement_id?: string;
    };

    if (!body.evidence_name?.trim()) {
      return NextResponse.json({ error: "evidence_name required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO evidence_requests
        (audit_project_id, organization_id, requirement_id, evidence_name,
         evidence_description, assigned_owner, due_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Not Submitted', ?, ?)
    `).run(
      pid, org,
      body.requirement_id   ?? null,
      body.evidence_name.trim(),
      body.evidence_description ?? null,
      body.assigned_owner   ?? null,
      body.due_date         ?? null,
      now, now,
    );
    const newId = Number(result.lastInsertRowid);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "audit_projects",
      targetId: newId, targetName: body.evidence_name,
      details: `Evidence request created: ${body.evidence_name} | Project: ${pid} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } finally { db.close(); }
}
