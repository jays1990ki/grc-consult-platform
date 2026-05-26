import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// GET /api/risk/controls?orgId=1&threat=&domain=&framework=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId     = Number(searchParams.get("orgId") ?? 1);
  const threat    = searchParams.get("threat")?.trim()    || null;
  const domain    = searchParams.get("domain")?.trim()    || null;
  const framework = searchParams.get("framework")?.trim() || null;

  const db = getDb();
  try {
    const conditions: string[] = ["organization_id = ?"];
    const params: unknown[]    = [orgId];

    if (framework) { conditions.push("framework = ?"); params.push(framework); }
    if (domain)    { conditions.push("domain = ?");    params.push(domain); }
    if (threat) {
      // Match controls whose related_threat contains any word from the threat name
      conditions.push("(related_threat LIKE ? OR related_threat LIKE ? OR related_threat LIKE ?)");
      const kw = threat.split(/\s+/).filter(Boolean)[0] ?? threat;
      params.push(`%${kw}%`, `%${threat}%`, `%${threat.split(" ")[0]}%`);
    }

    const rows = db.prepare(`
      SELECT id, framework, control_id, control_name, control_description, domain, related_threat, created_at
      FROM control_library
      WHERE ${conditions.join(" AND ")}
      ORDER BY control_id ASC
    `).all(...params);

    return NextResponse.json(rows);
  } finally { db.close(); }
}

// POST /api/risk/controls — add a custom control to the library
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const db = getDb();
  try {
    const { orgId = 1, framework = "ISO 27001:2022", control_id, control_name,
            control_description, domain, related_threat } = await req.json();

    if (!control_id || !control_name || !domain) {
      return NextResponse.json({ error: "control_id, control_name, domain required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO control_library
        (organization_id, framework, control_id, control_name, control_description, domain, related_threat, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, framework, control_id) DO UPDATE SET
        control_name        = excluded.control_name,
        control_description = excluded.control_description,
        domain              = excluded.domain,
        related_threat      = excluded.related_threat
    `).run(orgId, framework, control_id, control_name, control_description ?? null, domain, related_threat ?? null, now);

    return NextResponse.json({ id: result.lastInsertRowid, ok: true });
  } finally { db.close(); }
}
