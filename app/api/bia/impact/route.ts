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

/** GET /api/bia/impact?processId=1&orgId=1 */
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const { searchParams } = new URL(req.url);
  const processId = searchParams.get("processId");
  if (!processId) return NextResponse.json({ error: "processId required" }, { status: 400 });

  const db = getDb();
  try {
    const row = db.prepare(
      "SELECT * FROM bia_impact_scores WHERE process_id = ? AND organization_id = ?"
    ).get(Number(processId), org);
    return NextResponse.json(row ?? null);
  } finally { db.close(); }
}

/** POST /api/bia/impact — upsert impact scores + auto-update process RTO/RPO/Priority */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json() as {
      processId: number;
      impact_1h: number;
      impact_4h: number;
      impact_24h: number;
      impact_7d: number;
      financial_impact: number;
      legal_impact: number;
      operational_impact: number;
      reputation_impact: number;
      customer_impact: number;
      financial_loss_per_hour: number;
    };

    if (!body.processId) return NextResponse.json({ error: "processId required" }, { status: 400 });

    // Verify process belongs to org
    const proc = db.prepare(
      "SELECT id, process_name FROM business_processes WHERE id = ? AND organization_id = ?"
    ).get(body.processId, org) as any;
    if (!proc) return NextResponse.json({ error: "Process not found" }, { status: 404 });

    const now = new Date().toISOString();

    // Upsert impact scores
    db.prepare(`
      INSERT INTO bia_impact_scores
        (process_id, organization_id, impact_1h, impact_4h, impact_24h, impact_7d,
         financial_impact, legal_impact, operational_impact, reputation_impact, customer_impact,
         financial_loss_per_hour, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(process_id, organization_id) DO UPDATE SET
        impact_1h               = excluded.impact_1h,
        impact_4h               = excluded.impact_4h,
        impact_24h              = excluded.impact_24h,
        impact_7d               = excluded.impact_7d,
        financial_impact        = excluded.financial_impact,
        legal_impact            = excluded.legal_impact,
        operational_impact      = excluded.operational_impact,
        reputation_impact       = excluded.reputation_impact,
        customer_impact         = excluded.customer_impact,
        financial_loss_per_hour = excluded.financial_loss_per_hour,
        updated_at              = excluded.updated_at
    `).run(
      body.processId, org,
      body.impact_1h, body.impact_4h, body.impact_24h, body.impact_7d,
      body.financial_impact, body.legal_impact, body.operational_impact,
      body.reputation_impact, body.customer_impact,
      body.financial_loss_per_hour,
      now, now,
    );

    // Auto-update process priority/RTO/RPO
    const maxImpact = calcMaxTimeImpact(
      body.impact_1h, body.impact_4h, body.impact_24h, body.impact_7d
    );
    const priority = calcPriority(maxImpact);
    const rto      = calcRTO(maxImpact);
    const rpo      = calcRPO(maxImpact);

    db.prepare(`
      UPDATE business_processes
      SET priority_level = ?, rto = ?, rpo = ?, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).run(priority, rto, rpo, now, body.processId, org);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "bia_processes",
      targetId: body.processId, targetName: proc.process_name,
      details: `BIA impact saved: ${proc.process_name} | Priority→${priority} | RTO→${rto}h | RPO→${rpo}h | FinLoss: ฿${body.financial_loss_per_hour}/hr | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, priority, rto, rpo, maxImpact });
  } finally { db.close(); }
}
