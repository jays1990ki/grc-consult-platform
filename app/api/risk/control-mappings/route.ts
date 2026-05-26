import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { writeLog, getClientIP } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function orgId(req: NextRequest): number {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

// GET /api/risk/control-mappings?assessmentId=&orgId=
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId");
  if (!assessmentId) return NextResponse.json({ error: "assessmentId required" }, { status: 400 });

  const db = getDb();
  try {
    // Verify assessment belongs to org
    const assessment = db.prepare(
      "SELECT id FROM risk_assessments WHERE id = ? AND organization_id = ?"
    ).get(assessmentId, org);
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

    const rows = db.prepare(
      "SELECT control_id FROM risk_control_mappings WHERE assessment_id = ? AND selected = 1"
    ).all(assessmentId) as { control_id: string }[];
    return NextResponse.json(rows.map(r => r.control_id));
  } finally { db.close(); }
}

// POST /api/risk/control-mappings — save selected controls for an assessment
export async function POST(req: NextRequest) {
  const session = await getSession();
  const org = orgId(req);
  const db  = getDb();
  try {
    const { assessmentId, controlIds } = await req.json() as {
      assessmentId: number;
      controlIds: string[];
    };
    if (!assessmentId) return NextResponse.json({ error: "assessmentId required" }, { status: 400 });

    // Verify ownership
    const assessment = db.prepare(
      "SELECT id FROM risk_assessments WHERE id = ? AND organization_id = ?"
    ).get(assessmentId, org);
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO risk_control_mappings (organization_id, assessment_id, control_id, selected, created_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(assessment_id, control_id) DO UPDATE SET
        selected       = excluded.selected,
        organization_id = excluded.organization_id
    `);

    db.transaction(() => {
      db.prepare("UPDATE risk_control_mappings SET selected = 0 WHERE assessment_id = ?").run(assessmentId);
      for (const controlId of (controlIds ?? [])) {
        upsert.run(org, assessmentId, controlId, now);
      }
    })();

    if (session) {
      writeLog({
        userId: session.id, userName: session.name, userEmail: session.email,
        action: "update", module: "controls",
        targetId: assessmentId, targetName: `Assessment #${assessmentId}`,
        details: `Controls saved: ${controlIds?.length ?? 0} selected, Org: ${org}`,
        ipAddress: getClientIP(req),
      });
    }

    return NextResponse.json({ ok: true, count: controlIds?.length ?? 0 });
  } finally { db.close(); }
}
