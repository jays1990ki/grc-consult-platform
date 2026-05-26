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

/** GET /api/audit/projects?orgId=1 */
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    const rows = db.prepare(`
      SELECT ap.*,
             COUNT(er.id)                                     AS total_evidence,
             SUM(CASE WHEN er.status = 'Pass' THEN 1 ELSE 0 END) AS passed_evidence,
             SUM(CASE WHEN er.status = 'Fail' THEN 1 ELSE 0 END) AS failed_evidence,
             SUM(CASE WHEN er.status NOT IN ('Pass','Fail') AND er.due_date < date('now')
                       AND er.due_date != '' AND er.due_date IS NOT NULL
                       THEN 1 ELSE 0 END)                    AS overdue_evidence
      FROM audit_projects ap
      LEFT JOIN evidence_requests er
        ON er.audit_project_id = ap.id AND er.organization_id = ap.organization_id
      WHERE ap.organization_id = ?
      GROUP BY ap.id
      ORDER BY ap.created_at DESC
    `).all(org);
    return NextResponse.json(rows);
  } finally { db.close(); }
}

/** POST /api/audit/projects */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json() as {
      project_name: string;
      framework?: string;
      auditor_name?: string;
      client_name?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
    };

    if (!body.project_name?.trim()) {
      return NextResponse.json({ error: "project_name required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO audit_projects
        (organization_id, project_name, framework, auditor_name, client_name,
         start_date, end_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      org,
      body.project_name.trim(),
      body.framework    ?? null,
      body.auditor_name ?? null,
      body.client_name  ?? null,
      body.start_date   ?? null,
      body.end_date     ?? null,
      body.status       ?? "Planning",
      now, now,
    );
    const newId = Number(result.lastInsertRowid);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "audit_projects",
      targetId: newId, targetName: body.project_name,
      details: `Audit project created: ${body.project_name} | Framework: ${body.framework ?? "—"} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } finally { db.close(); }
}
