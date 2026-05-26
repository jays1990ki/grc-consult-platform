import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { calcMaxTimeImpact, calcRTO, calcRPO, calcPriority } from "@/lib/bia-utils";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** GET /api/bia/processes?orgId=1 */
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    const rows = db.prepare(`
      SELECT bp.*,
             bis.impact_1h, bis.impact_4h, bis.impact_24h, bis.impact_7d,
             bis.financial_impact, bis.legal_impact, bis.operational_impact,
             bis.reputation_impact, bis.customer_impact,
             bis.financial_loss_per_hour,
             CASE WHEN bis.id IS NOT NULL THEN 1 ELSE 0 END AS has_impact
      FROM business_processes bp
      LEFT JOIN bia_impact_scores bis
        ON bis.process_id = bp.id AND bis.organization_id = bp.organization_id
      WHERE bp.organization_id = ?
      ORDER BY bp.created_at DESC
    `).all(org);
    return NextResponse.json(rows);
  } finally { db.close(); }
}

/** POST /api/bia/processes */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json() as {
      process_name: string;
      process_owner?: string;
      department?: string;
      related_it_system?: string;
      related_assets?: number[];
      priority_level?: string;
      mtpd?: number;
      rto?: number;
      rpo?: number;
      status?: string;
    };

    if (!body.process_name?.trim()) {
      return NextResponse.json({ error: "process_name required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO business_processes
        (organization_id, process_name, process_owner, department, related_it_system,
         related_assets, priority_level, mtpd, rto, rpo, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      org,
      body.process_name.trim(),
      body.process_owner  ?? null,
      body.department     ?? null,
      body.related_it_system ?? null,
      JSON.stringify(body.related_assets ?? []),
      body.priority_level ?? "Medium",
      body.mtpd ?? null,
      body.rto  ?? null,
      body.rpo  ?? null,
      body.status ?? "Active",
      now, now,
    );
    const newId = Number(result.lastInsertRowid);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "bia_processes",
      targetId: newId, targetName: body.process_name,
      details: `BIA process created: ${body.process_name} | Priority: ${body.priority_level ?? "Medium"} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } finally { db.close(); }
}
