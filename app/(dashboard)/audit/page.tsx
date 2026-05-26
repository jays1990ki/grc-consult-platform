import Database from "better-sqlite3";
import path from "path";
import AuditProjectsList, { type AuditProjectRow } from "@/components/audit/AuditProjectsList";
import { DB_PATH } from "@/lib/db-path";

const ORG_ID = 1;

interface AuditStats {
  totalProjects: number;
  activeProjects: number;
  completionPct: number;
  overdueEvidence: number;
  recentFiles: any[];
}

function getData(): { projects: AuditProjectRow[]; stats: AuditStats; frameworkOptions: string[] } {
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    const projects = db.prepare(`
      SELECT ap.*,
             COUNT(er.id)                                          AS total_evidence,
             SUM(CASE WHEN er.status = 'Pass' THEN 1 ELSE 0 END)  AS passed_evidence,
             SUM(CASE WHEN er.status = 'Fail' THEN 1 ELSE 0 END)  AS failed_evidence,
             SUM(CASE WHEN er.status NOT IN ('Pass','Fail')
                       AND er.due_date IS NOT NULL AND er.due_date != ''
                       AND er.due_date < date('now') THEN 1 ELSE 0 END) AS overdue_evidence
      FROM audit_projects ap
      LEFT JOIN evidence_requests er
        ON er.audit_project_id = ap.id AND er.organization_id = ap.organization_id
      WHERE ap.organization_id = ?
      GROUP BY ap.id
      ORDER BY ap.created_at DESC
    `).all(ORG_ID) as AuditProjectRow[];

    // Stats
    const totalProjects  = projects.length;
    const activeProjects = projects.filter(p => p.status === "Active").length;

    const evidRow = db.prepare(`
      SELECT
        COUNT(er.id)                                              AS total,
        SUM(CASE WHEN er.status IN ('Pass','Fail') THEN 1 ELSE 0 END) AS completed
      FROM evidence_requests er
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE er.organization_id = ? AND ap.status = 'Active'
    `).get(ORG_ID) as any;

    const overdueRow = (db.prepare(`
      SELECT COUNT(*) AS c FROM evidence_requests er
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE er.organization_id = ?
        AND er.status NOT IN ('Pass','Fail')
        AND er.due_date IS NOT NULL AND er.due_date != ''
        AND er.due_date < date('now')
    `).get(ORG_ID) as any).c as number;

    const recentFiles = db.prepare(`
      SELECT ef.original_filename, ef.uploaded_by, ef.created_at, ef.version_number,
             er.evidence_name, ap.project_name
      FROM evidence_files ef
      JOIN evidence_requests er ON er.id = ef.evidence_request_id
      JOIN audit_projects ap ON ap.id = er.audit_project_id
      WHERE ef.organization_id = ?
      ORDER BY ef.created_at DESC LIMIT 5
    `).all(ORG_ID) as any[];

    // Dynamic framework names from DB
    const fwRows = db.prepare(
      "SELECT name, version FROM gap_frameworks ORDER BY id ASC"
    ).all() as { name: string; version: string }[];
    const frameworkOptions = fwRows.map(f => `${f.name}:${f.version}`);

    db.close();

    const completionPct = evidRow?.total > 0
      ? Math.round((evidRow.completed / evidRow.total) * 100)
      : 0;

    return {
      projects,
      stats: { totalProjects, activeProjects, completionPct, overdueEvidence: overdueRow, recentFiles },
      frameworkOptions,
    };
  } catch {
    return {
      projects: [],
      stats: { totalProjects: 0, activeProjects: 0, completionPct: 0, overdueEvidence: 0, recentFiles: [] },
      frameworkOptions: [],
    };
  }
}

export default function AuditPage() {
  const { projects, stats, frameworkOptions } = getData();

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          GRC Platform → <span className="text-gray-700 font-medium">IT Audit Evidence Portal</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">IT Audit Projects</h1>
        <p className="text-gray-500 mt-1">
          จัดการโครงการตรวจสอบ IT — รวบรวมหลักฐาน ติดตามสถานะ และออกรายงาน
        </p>
      </div>

      <AuditProjectsList initialProjects={projects} stats={stats} orgId={ORG_ID} frameworkOptions={frameworkOptions} />
    </div>
  );
}
