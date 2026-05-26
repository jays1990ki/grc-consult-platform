import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getRiskLevel } from "@/lib/risk-utils";
import { writeLog, getClientIP } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function getOrg(req: NextRequest): number {
  return Number(
    req.headers.get("x-org-id") ??
    new URL(req.url).searchParams.get("orgId") ??
    1
  );
}

// Kanban column order
const STATUS_ORDER = [
  "To Do",
  "In Progress",
  "Pending Evidence",
  "Under Review",
  "Done",
  "Accepted by Management",
] as const;

const TREATMENT_BASE_SQL = `
  SELECT
    rt.*,
    ra.threat_name, ra.inherent_risk, ra.risk_level,
    ra.likelihood,  ra.impact,
    ras.name  AS asset_name,
    ras.type  AS asset_type
  FROM risk_treatments rt
  JOIN risk_assessments ra  ON ra.id  = rt.risk_id
  JOIN risk_assets      ras ON ras.id = ra.asset_id
`;

// GET /api/risk/treatments?orgId=&riskId=&status=
export async function GET(req: NextRequest) {
  const org = getOrg(req);
  const { searchParams } = new URL(req.url);
  const riskId = searchParams.get("riskId");
  const status = searchParams.get("status");

  const db = getDb();
  try {
    const conds: string[] = ["rt.organization_id = ?"];
    const params: unknown[] = [org];

    if (riskId) { conds.push("rt.risk_id = ?");  params.push(Number(riskId)); }
    if (status) { conds.push("rt.status = ?");    params.push(status); }

    const rows = db.prepare(
      `${TREATMENT_BASE_SQL} WHERE ${conds.join(" AND ")} ORDER BY rt.updated_at DESC`
    ).all(...params);

    return NextResponse.json(rows);
  } finally { db.close(); }
}

// POST /api/risk/treatments — upsert full treatment record
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = getOrg(req);
  const db  = getDb();
  try {
    const body = await req.json();
    const {
      riskId, treatmentOption = "Mitigate",
      actionPlan, owner, dueDate, budget,
      expectedResidualRisk, status = "To Do",
    } = body;

    if (!riskId) return NextResponse.json({ error: "riskId required" }, { status: 400 });

    // Verify risk belongs to org
    const risk = db.prepare(
      "SELECT id, threat_name, inherent_risk FROM risk_assessments WHERE id = ? AND organization_id = ?"
    ).get(riskId, org) as any;
    if (!risk) return NextResponse.json({ error: "Risk not found" }, { status: 404 });

    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO risk_treatments
        (organization_id, risk_id, treatment_option, action_plan, owner, due_date,
         budget, expected_residual_risk, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, risk_id) DO UPDATE SET
        treatment_option       = excluded.treatment_option,
        action_plan            = excluded.action_plan,
        owner                  = excluded.owner,
        due_date               = excluded.due_date,
        budget                 = excluded.budget,
        expected_residual_risk = excluded.expected_residual_risk,
        status                 = excluded.status,
        updated_at             = excluded.updated_at
    `).run(
      org, riskId, treatmentOption,
      actionPlan || null, owner || null, dueDate || null,
      budget ? Number(budget) : null,
      expectedResidualRisk ? Number(expectedResidualRisk) : null,
      status, now, now,
    );

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "risk_treatments",
      targetId: Number(result.lastInsertRowid || riskId),
      targetName: risk.threat_name,
      details: `Option: ${treatmentOption}, Status: ${status}, Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, id: result.lastInsertRowid || null });
  } finally { db.close(); }
}

// PATCH /api/risk/treatments — update status only (Kanban drag-drop)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = getOrg(req);
  const db  = getDb();
  try {
    const { treatmentId, status } = await req.json() as {
      treatmentId: number;
      status: string;
    };

    if (!treatmentId || !status) {
      return NextResponse.json({ error: "treatmentId and status required" }, { status: 400 });
    }
    if (!STATUS_ORDER.includes(status as any)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${STATUS_ORDER.join(", ")}` }, { status: 400 });
    }

    // Verify ownership
    const treatment = db.prepare(`
      ${TREATMENT_BASE_SQL}
      WHERE rt.id = ? AND rt.organization_id = ?
    `).get(treatmentId, org) as any;
    if (!treatment) return NextResponse.json({ error: "Treatment not found" }, { status: 404 });

    const now = new Date().toISOString();
    const prevStatus = treatment.status;

    // Auto-calculate residual risk when status → Done
    let residualRiskScore: number | null = treatment.residual_risk_score;
    if (status === "Done" && prevStatus !== "Done") {
      residualRiskScore = treatment.expected_residual_risk != null
        ? Number(treatment.expected_residual_risk)
        : Math.round(Number(treatment.inherent_risk) * 0.30 * 100) / 100; // 70% reduction default
    }

    db.prepare(`
      UPDATE risk_treatments
      SET status = ?, residual_risk_score = ?, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).run(status, residualRiskScore, now, treatmentId, org);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "risk_treatments",
      targetId: treatmentId,
      targetName: treatment.threat_name,
      details: `Status: ${prevStatus} → ${status}${status === "Done" ? `, ResidualRisk: ${residualRiskScore}` : ""}, Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({
      ok: true,
      status,
      residualRiskScore,
      autoCalculated: status === "Done" && prevStatus !== "Done",
    });
  } finally { db.close(); }
}
