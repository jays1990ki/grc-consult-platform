import Database from "better-sqlite3";
import path from "path";
import FrameworksList, { type FrameworkRow } from "@/components/admin/FrameworksList";

function getFrameworks(): FrameworkRow[] {
  try {
    const db  = new Database(path.join(process.cwd(), "data", "app.db"));
    db.pragma("journal_mode = WAL");
    const rows = db.prepare(`
      SELECT gf.*, COUNT(gr.id) AS requirement_count
      FROM gap_frameworks gf
      LEFT JOIN gap_requirements gr ON gr.framework_id = gf.id
      GROUP BY gf.id
      ORDER BY gf.id ASC
    `).all() as FrameworkRow[];
    db.close();
    return rows;
  } catch { return []; }
}

export default function AdminFrameworksPage() {
  const frameworks = getFrameworks();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Admin → <span className="text-gray-700 font-medium">Framework Management</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Framework Management</h1>
        <p className="text-gray-500 mt-1">
          Add, edit, and delete compliance frameworks and their requirements.
          Changes appear immediately in GAP Analysis and IT Audit.
        </p>
      </div>

      <FrameworksList initialFrameworks={frameworks} />
    </div>
  );
}
