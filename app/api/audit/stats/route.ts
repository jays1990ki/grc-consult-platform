import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** GET /api/audit/stats?orgId=1 */
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    const totalProjects = (db.prepare(
      "SELECT COUNT(*) AS c FROM audit_projects WHERE organization_id = ?"
    ).get(org) as any).c as number;

    const activeProjects = (db.prepare(
      "SELECT COUNT(*) AS c FROM audit_projects WHERE organization_id = ? AND status = 'Active'"
    ).get(org) as any).c as number;

    // Evidence completion across active projects
    const evidenceStats = db.prepare(`
      SELECT
        COUNT(er.id)                                            AS total,
        SUM(CASE WHEN er.status = 'Pass' THEN 1 ELSE 0 END)    AS passed,
        SUM(CASE WHEN er.status = 'Fail' THEN 1 ELSE 0 END)    AS failed,
        SUM(CASE WHEN er.status IN ('Pass','Fail') THEN 1 ELSE 0 END) AS completed
      FROM evidence_requests er
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE er.organization_id = ? AND ap.status = 'Active'
    `).get(org) as any;

    // Overdue: not completed and past due_date
    const overdue = (db.prepare(`
      SELECT COUNT(*) AS c
      FROM evidence_requests er
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE er.organization_id = ?
        AND er.status NOT IN ('Pass','Fail')
        AND er.due_date IS NOT NULL AND er.due_date != ''
        AND er.due_date < date('now')
    `).get(org) as any).c as number;

    // Recent activity: last 5 uploaded/reviewed files
    const recentFiles = db.prepare(`
      SELECT ef.original_filename, ef.uploaded_by, ef.created_at, ef.version_number,
             er.evidence_name, ap.project_name
      FROM evidence_files ef
      JOIN evidence_requests er ON er.id = ef.evidence_request_id
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE ef.organization_id = ?
      ORDER BY ef.created_at DESC
      LIMIT 5
    `).all(org) as any[];

    const completionPct = evidenceStats?.total > 0
      ? Math.round((evidenceStats.completed / evidenceStats.total) * 100)
      : 0;

    return NextResponse.json({
      totalProjects,
      activeProjects,
      totalEvidence:  evidenceStats?.total     ?? 0,
      passedEvidence: evidenceStats?.passed    ?? 0,
      failedEvidence: evidenceStats?.failed    ?? 0,
      completedEvidence: evidenceStats?.completed ?? 0,
      completionPct,
      overdueEvidence: overdue,
      recentFiles,
    });
  } finally { db.close(); }
}
