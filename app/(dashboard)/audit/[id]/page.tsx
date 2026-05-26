import Database from "better-sqlite3";
import path from "path";
import { notFound } from "next/navigation";
import AuditProjectDetail, {
  type AuditProject,
  type EvidenceRow,
} from "@/components/audit/AuditProjectDetail";

const ORG_ID = 1;

function getData(id: number): { project: AuditProject; evidence: EvidenceRow[] } | null {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    db.pragma("journal_mode = WAL");

    const project = db.prepare(
      "SELECT * FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(id, ORG_ID) as AuditProject | undefined;

    if (!project) { db.close(); return null; }

    const evidence = db.prepare(`
      SELECT er.*,
             COUNT(ef.id)              AS file_count,
             MAX(ef.version_number)    AS latest_version
      FROM evidence_requests er
      LEFT JOIN evidence_files ef ON ef.evidence_request_id = er.id
      WHERE er.audit_project_id = ? AND er.organization_id = ?
      GROUP BY er.id
      ORDER BY er.created_at ASC
    `).all(id, ORG_ID) as EvidenceRow[];

    db.close();
    return { project, evidence };
  } catch {
    return null;
  }
}

export default function AuditProjectPage({ params }: { params: { id: string } }) {
  const id   = Number(params.id);
  const data = getData(id);
  if (!data) notFound();

  const { project, evidence } = data;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          <a href="/audit" className="hover:text-blue-600">IT Audit</a>
          {" → "}
          <span className="text-gray-700 font-medium">{project.project_name}</span>
        </p>
      </div>

      <AuditProjectDetail
        project={project}
        initialEvidence={evidence}
        orgId={ORG_ID}
      />
    </div>
  );
}
