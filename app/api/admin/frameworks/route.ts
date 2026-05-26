import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/** GET /api/admin/frameworks */
export async function GET() {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT gf.*, COUNT(gr.id) AS requirement_count
      FROM gap_frameworks gf
      LEFT JOIN gap_requirements gr ON gr.framework_id = gf.id
      GROUP BY gf.id
      ORDER BY gf.id ASC
    `).all();
    return NextResponse.json(rows);
  } finally { db.close(); }
}

/** POST /api/admin/frameworks */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  try {
    const body = await req.json() as {
      name: string;
      version: string;
      description?: string;
      category?: string;
    };

    if (!body.name?.trim() || !body.version?.trim()) {
      return NextResponse.json({ error: "name and version required" }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO gap_frameworks (name, version, description, category, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      body.name.trim(),
      body.version.trim(),
      body.description ?? null,
      body.category ?? "Information Security",
    );
    const newId = Number(result.lastInsertRowid);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "gap_frameworks",
      targetId: newId, targetName: body.name,
      details: `Framework created: ${body.name} v${body.version} | Category: ${body.category ?? "Information Security"}`,
      ipAddress: getClientIP(req),
    });

    const row = db.prepare("SELECT *, 0 AS requirement_count FROM gap_frameworks WHERE id = ?").get(newId);
    return NextResponse.json({ ok: true, id: newId, framework: row }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Framework with this name + version already exists" }, { status: 409 });
    }
    throw e;
  } finally { db.close(); }
}
