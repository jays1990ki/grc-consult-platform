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

/** GET /api/admin/frameworks/[id]/requirements */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fwId = Number(params.id);
  const db   = getDb();
  try {
    const rows = db.prepare(`
      SELECT * FROM gap_requirements
      WHERE framework_id = ?
      ORDER BY sort_order ASC, requirement_id ASC
    `).all(fwId);
    return NextResponse.json(rows);
  } finally { db.close(); }
}

/** POST /api/admin/frameworks/[id]/requirements */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fwId = Number(params.id);
  const db   = getDb();
  try {
    // Verify framework exists
    const fw = db.prepare("SELECT name FROM gap_frameworks WHERE id = ?").get(fwId) as any;
    if (!fw) return NextResponse.json({ error: "Framework not found" }, { status: 404 });

    const body = await req.json() as {
      requirement_id: string;
      requirement_name: string;
      domain: string;
      description?: string;
      guidance?: string;
      sort_order?: number;
    };

    if (!body.requirement_id?.trim() || !body.requirement_name?.trim() || !body.domain?.trim()) {
      return NextResponse.json({ error: "requirement_id, requirement_name, domain required" }, { status: 400 });
    }

    // Auto-assign sort_order if not provided
    let sortOrder = body.sort_order;
    if (sortOrder === undefined) {
      const maxRow = db.prepare(
        "SELECT MAX(sort_order) AS m FROM gap_requirements WHERE framework_id = ?"
      ).get(fwId) as any;
      sortOrder = (maxRow?.m ?? 0) + 10;
    }

    const result = db.prepare(`
      INSERT INTO gap_requirements
        (framework_id, requirement_id, requirement_name, domain, description, guidance, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      fwId,
      body.requirement_id.trim(),
      body.requirement_name.trim(),
      body.domain.trim(),
      body.description ?? null,
      body.guidance    ?? null,
      sortOrder,
    );
    const newId = Number(result.lastInsertRowid);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "gap_requirements",
      targetId: newId, targetName: body.requirement_id,
      details: `Requirement created: ${body.requirement_id} — ${body.requirement_name} | Framework: ${fw.name}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Requirement ID already exists in this framework" }, { status: 409 });
    }
    throw e;
  } finally { db.close(); }
}
