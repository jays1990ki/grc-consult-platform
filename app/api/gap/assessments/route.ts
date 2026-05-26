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

function orgId(req: NextRequest): number {
  return Number(
    req.headers.get("x-org-id") ??
    new URL(req.url).searchParams.get("orgId") ??
    1
  );
}

// GET /api/gap/assessments?orgId=1&frameworkId=1
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const { searchParams } = new URL(req.url);
  const frameworkId = searchParams.get("frameworkId");

  const db = getDb();
  try {
    const conds: string[] = ["ga.organization_id = ?"];
    const params: unknown[] = [org];
    if (frameworkId) {
      conds.push("ga.framework_id = ?");
      params.push(Number(frameworkId));
    }

    const rows = db.prepare(`
      SELECT
        ga.*,
        gr.requirement_id AS req_code,
        gr.requirement_name,
        gr.domain,
        gr.description,
        gr.guidance,
        gr.sort_order
      FROM gap_assessments ga
      JOIN gap_requirements gr ON gr.id = ga.requirement_id
      WHERE ${conds.join(" AND ")}
      ORDER BY gr.sort_order ASC
    `).all(...params);

    return NextResponse.json(rows);
  } finally { db.close(); }
}

// POST /api/gap/assessments — bulk upsert
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json() as {
      frameworkId: number;
      assessments: Array<{
        requirementId: number;
        status: string;
        evidenceReference?: string;
        comment?: string;
        responsiblePerson?: string;
        gapSeverity?: string;
      }>;
    };

    const { frameworkId, assessments } = body;
    if (!frameworkId || !Array.isArray(assessments)) {
      return NextResponse.json({ error: "frameworkId and assessments[] required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO gap_assessments
        (organization_id, framework_id, requirement_id, status,
         evidence_reference, comment, responsible_person, gap_severity,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, requirement_id) DO UPDATE SET
        status             = excluded.status,
        evidence_reference = excluded.evidence_reference,
        comment            = excluded.comment,
        responsible_person = excluded.responsible_person,
        gap_severity       = excluded.gap_severity,
        updated_at         = excluded.updated_at
    `);

    db.transaction(() => {
      for (const a of assessments) {
        upsert.run(
          org, frameworkId, a.requirementId, a.status,
          a.evidenceReference || null,
          a.comment           || null,
          a.responsiblePerson || null,
          a.gapSeverity       || null,
          now, now,
        );
      }
    })();

    const nonCompliant = assessments.filter(a => a.status === "Non-Compliant").length;
    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "gap_assessments",
      details: `GAP assessment saved: ${assessments.length} requirements, ${nonCompliant} Non-Compliant, Framework: ${frameworkId}, Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, count: assessments.length });
  } finally { db.close(); }
}
