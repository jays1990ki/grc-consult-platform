import Database from "better-sqlite3";
import path from "path";
import { notFound } from "next/navigation";
import EvidenceDetail, {
  type EvidenceRequest,
  type EvidenceFile,
} from "@/components/audit/EvidenceDetail";
import { DB_PATH } from "@/lib/db-path";

const ORG_ID = 1;

function getData(
  pid: number,
  eid: number
): { evidence: EvidenceRequest; files: EvidenceFile[]; projectName: string } | null {
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    const project = db.prepare(
      "SELECT project_name FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(pid, ORG_ID) as any;
    if (!project) { db.close(); return null; }

    const evidence = db.prepare(
      "SELECT * FROM evidence_requests WHERE id = ? AND audit_project_id = ? AND organization_id = ?"
    ).get(eid, pid, ORG_ID) as EvidenceRequest | undefined;
    if (!evidence) { db.close(); return null; }

    const files = db.prepare(`
      SELECT * FROM evidence_files
      WHERE evidence_request_id = ?
      ORDER BY version_number DESC
    `).all(eid) as EvidenceFile[];

    db.close();
    return { evidence, files, projectName: project.project_name };
  } catch {
    return null;
  }
}

export default function EvidencePage({ params }: { params: { id: string; eid: string } }) {
  const pid  = Number(params.id);
  const eid  = Number(params.eid);
  const data = getData(pid, eid);
  if (!data) notFound();

  const { evidence, files, projectName } = data;

  return (
    <div className="max-w-4xl space-y-2">
      <div>
        <p className="text-xs text-gray-400 mb-2">
          <a href="/audit" className="hover:text-blue-600">IT Audit</a>
          {" → "}
          <a href={`/audit/${pid}`} className="hover:text-blue-600">{projectName}</a>
          {" → "}
          <span className="text-gray-700 font-medium">{evidence.evidence_name}</span>
        </p>
      </div>

      <EvidenceDetail
        evidence={evidence}
        initialFiles={files}
        projectName={projectName}
        orgId={ORG_ID}
      />
    </div>
  );
}
