import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

// GET /api/gap/requirements?frameworkId=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const frameworkId = searchParams.get("frameworkId");
  if (!frameworkId) {
    return NextResponse.json({ error: "frameworkId required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT * FROM gap_requirements
      WHERE framework_id = ?
      ORDER BY sort_order ASC, requirement_id ASC
    `).all(frameworkId);
    return NextResponse.json(rows);
  } finally { db.close(); }
}
