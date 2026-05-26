import Database from "better-sqlite3";
import path from "path";
import { notFound } from "next/navigation";
import RequirementsList, {
  type FrameworkInfo,
  type RequirementRow,
} from "@/components/admin/RequirementsList";
import { DB_PATH } from "@/lib/db-path";

function getData(id: number): { framework: FrameworkInfo; requirements: RequirementRow[] } | null {
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    const fw = db.prepare("SELECT * FROM gap_frameworks WHERE id = ?").get(id) as FrameworkInfo | undefined;
    if (!fw) { db.close(); return null; }

    const reqs = db.prepare(`
      SELECT * FROM gap_requirements
      WHERE framework_id = ?
      ORDER BY sort_order ASC, requirement_id ASC
    `).all(id) as RequirementRow[];

    db.close();
    return { framework: fw, requirements: reqs };
  } catch { return null; }
}

export default function AdminFrameworkRequirementsPage({ params }: { params: { id: string } }) {
  const id   = Number(params.id);
  const data = getData(id);
  if (!data) notFound();

  const { framework, requirements } = data;

  const domainCount = new Set(requirements.map(r => r.domain)).size;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          <a href="/admin/frameworks" className="hover:text-blue-600">Framework Management</a>
          {" → "}
          <span className="text-gray-700 font-medium">{framework.name} v{framework.version}</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{framework.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>Version {framework.version}</span>
          {framework.category && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {framework.category}
            </span>
          )}
          <span>{requirements.length} requirements across {domainCount} domains</span>
        </div>
      </div>

      <RequirementsList framework={framework} initialRequirements={requirements} />
    </div>
  );
}
