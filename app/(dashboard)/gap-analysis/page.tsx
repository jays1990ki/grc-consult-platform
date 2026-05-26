import Database from "better-sqlite3";
import path from "path";
import GapAnalysis from "@/components/gap/GapAnalysis";
import { DB_PATH } from "@/lib/db-path";

const ORG_ID = 1;

interface Framework {
  id: number;
  name: string;
  version: string;
  description: string;
  requirement_count: number;
}

function getFrameworks(): Framework[] {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    return db.prepare(`
      SELECT gf.*,
             COUNT(gr.id) AS requirement_count
      FROM gap_frameworks gf
      LEFT JOIN gap_requirements gr ON gr.framework_id = gf.id
      GROUP BY gf.id
      ORDER BY gf.id ASC
    `).all() as Framework[];
  } finally {
    db.close();
  }
}

export default function GapAnalysisPage() {
  const frameworks = getFrameworks();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GAP Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assess your organization&apos;s compliance posture against regulatory frameworks
          and convert gaps into actionable risk items.
        </p>
      </div>

      <GapAnalysis initialFrameworks={frameworks} orgId={ORG_ID} />
    </div>
  );
}
