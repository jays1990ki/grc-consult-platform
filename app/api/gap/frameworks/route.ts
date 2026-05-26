import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

export async function GET() {
  const db = getDb();
  try {
    const frameworks = db.prepare(`
      SELECT gf.*, COUNT(gr.id) AS requirement_count
      FROM gap_frameworks gf
      LEFT JOIN gap_requirements gr ON gr.framework_id = gf.id
      GROUP BY gf.id
      ORDER BY gf.id ASC
    `).all();
    return NextResponse.json(frameworks);
  } finally { db.close(); }
}
