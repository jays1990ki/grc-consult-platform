import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { calcInherentRisk, calcAssetValue, getRiskLevel } from "@/lib/risk-utils";
import { writeLog, getClientIP } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
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

// Severity → likelihood mapping
const SEV_LIKELIHOOD: Record<string, number> = {
  High:   4,
  Medium: 3,
  Low:    2,
};

/**
 * POST /api/gap/convert
 * { gapAssessmentId: number, orgId?: number }
 *
 * Finds/creates a "Compliance & Regulatory" asset for the org,
 * creates a risk_assessment from the non-compliant gap item,
 * marks gap_assessment.converted_to_risk = 1.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();
  try {
    const { gapAssessmentId } = await req.json() as { gapAssessmentId: number };
    if (!gapAssessmentId) {
      return NextResponse.json({ error: "gapAssessmentId required" }, { status: 400 });
    }

    // 1. Load gap assessment + requirement
    const gap = db.prepare(`
      SELECT ga.*, gr.requirement_id AS req_code,
             gr.requirement_name, gr.domain, gr.description,
             gf.name AS framework_name
      FROM gap_assessments ga
      JOIN gap_requirements gr ON gr.id = ga.requirement_id
      JOIN gap_frameworks gf   ON gf.id = ga.framework_id
      WHERE ga.id = ? AND ga.organization_id = ?
    `).get(gapAssessmentId, org) as any;

    if (!gap) {
      return NextResponse.json({ error: "GAP assessment not found" }, { status: 404 });
    }
    if (gap.status !== "Non-Compliant") {
      return NextResponse.json({ error: "Only Non-Compliant items can be converted to risk" }, { status: 400 });
    }
    if (gap.converted_to_risk) {
      return NextResponse.json({ error: "Already converted to risk" }, { status: 409 });
    }

    const now = new Date().toISOString();

    // 2. Find or create "Compliance & Regulatory" asset for this org
    let complianceAsset = db.prepare(`
      SELECT id, asset_value FROM risk_assets
      WHERE name = 'Compliance & Regulatory Requirements' AND organization_id = ?
    `).get(org) as { id: number; asset_value: number } | undefined;

    if (!complianceAsset) {
      // C=4 (Confidentiality high), I=4 (Integrity high), A=3 (Availability medium)
      const assetValue = calcAssetValue(4, 4, 3); // 3.67
      const result = db.prepare(`
        INSERT INTO risk_assets
          (organization_id, name, type, confidentiality, integrity, availability,
           asset_value, description, owner, created_at)
        VALUES (?, 'Compliance & Regulatory Requirements', 'Data', 4, 4, 3, ?,
                'Auto-created for GAP Analysis compliance tracking', 'Compliance Team', ?)
      `).run(org, assetValue, now);
      complianceAsset = { id: Number(result.lastInsertRowid), asset_value: assetValue };
    }

    // 3. Compute risk score
    const likelihood   = SEV_LIKELIHOOD[gap.gap_severity] ?? 3;
    const impact       = 4; // compliance failures have high impact
    const inherentRisk = calcInherentRisk(likelihood, impact, complianceAsset.asset_value);
    const riskLevel    = getRiskLevel(inherentRisk);
    const threatName   = `${gap.req_code} — ${gap.requirement_name} (Non-Compliant, ${gap.framework_name})`;

    // 4. Create risk assessment
    const riskResult = db.prepare(`
      INSERT INTO risk_assessments
        (organization_id, asset_id, threat_name, likelihood, impact,
         inherent_risk, risk_level, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      org,
      complianceAsset.id,
      threatName,
      likelihood,
      impact,
      inherentRisk,
      riskLevel,
      `Auto-created from GAP Analysis. Domain: ${gap.domain}. Evidence: ${gap.evidence_reference ?? "None"}. Responsible: ${gap.responsible_person ?? "Unassigned"}`,
      now,
    );
    const newRiskId = Number(riskResult.lastInsertRowid);

    // 5. Mark converted
    db.prepare(`
      UPDATE gap_assessments
      SET converted_to_risk = 1, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).run(now, gapAssessmentId, org);

    // 6. Audit log
    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "create", module: "gap_assessments",
      targetId: newRiskId, targetName: threatName,
      details: `Converted GAP ${gap.req_code} → Risk #${newRiskId}, Level: ${riskLevel}, Score: ${inherentRisk}, Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({
      ok:            true,
      riskId:        newRiskId,
      riskLevel,
      inherentRisk,
      threatName,
      assetId:       complianceAsset.id,
    });
  } finally { db.close(); }
}
