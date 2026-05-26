import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { ISO_CONTROLS, countByCategory } from "@/lib/iso-controls";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

function orgId(req: NextRequest): number {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    // Risk level counts — org scoped
    const levelCounts = db.prepare(`
      SELECT risk_level, COUNT(*) as count
      FROM risk_assessments
      WHERE organization_id = ?
      GROUP BY risk_level
    `).all(org) as { risk_level: string; count: number }[];

    // Matrix data — org scoped
    const matrixRows = db.prepare(`
      SELECT likelihood, impact, COUNT(*) as count
      FROM risk_assessments
      WHERE organization_id = ?
      GROUP BY likelihood, impact
    `).all(org) as { likelihood: number; impact: number; count: number }[];

    const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const r of matrixRows) {
      if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5) {
        matrix[r.likelihood - 1][r.impact - 1] = r.count;
      }
    }

    // Compliance: controls applied (scoped to org via assessment join)
    const applied = db.prepare(`
      SELECT rcm.control_id
      FROM risk_control_mappings rcm
      JOIN risk_assessments ra ON ra.id = rcm.assessment_id
      WHERE rcm.selected = 1 AND ra.organization_id = ?
    `).all(org) as { control_id: string }[];
    const appliedSet = new Set(applied.map(r => r.control_id));

    const totalByCategory   = countByCategory();
    const appliedByCategory: Record<string, number> = {};
    for (const c of ISO_CONTROLS) {
      if (appliedSet.has(c.id)) {
        appliedByCategory[c.category] = (appliedByCategory[c.category] ?? 0) + 1;
      }
    }

    // Also count controls from control_library
    const libApplied = db.prepare(`
      SELECT rcm.control_id
      FROM risk_control_mappings rcm
      JOIN risk_assessments ra ON ra.id = rcm.assessment_id
      JOIN control_library cl ON cl.control_id = rcm.control_id AND cl.organization_id = ra.organization_id
      WHERE rcm.selected = 1 AND ra.organization_id = ?
    `).all(org) as { control_id: string }[];

    const complianceScores: Record<string, number> = {};
    for (const cat of ["A.5", "A.6", "A.7", "A.8"]) {
      const total = totalByCategory[cat] ?? 1;
      const done  = appliedByCategory[cat] ?? 0;
      complianceScores[cat] = Math.round((done / total) * 100);
    }

    // Control library compliance (the 11 DB-seeded controls)
    const totalLibControls = (db.prepare(
      "SELECT COUNT(*) as c FROM control_library WHERE organization_id = ?"
    ).get(org) as any).c;
    const appliedLibControls = new Set(libApplied.map(r => r.control_id)).size;
    const libCompliancePct = totalLibControls > 0
      ? Math.round((appliedLibControls / totalLibControls) * 100)
      : 0;

    // Asset type distribution — org scoped
    const assetTypes = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM risk_assets
      WHERE organization_id = ?
      GROUP BY type
    `).all(org) as { type: string; count: number }[];

    // Recent critical — org scoped
    const criticals = db.prepare(`
      SELECT ra.*, ras.name as asset_name
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      WHERE ra.risk_level = 'Critical' AND ra.organization_id = ?
      ORDER BY ra.inherent_risk DESC LIMIT 5
    `).all(org);

    return NextResponse.json({
      levelCounts,
      matrix,
      complianceScores,
      libCompliancePct,
      appliedLibControls,
      totalLibControls,
      assetTypes,
      criticals,
      totalAssessments: matrixRows.reduce((s, r) => s + r.count, 0),
      totalAssets: (db.prepare(
        "SELECT COUNT(*) as c FROM risk_assets WHERE organization_id = ?"
      ).get(org) as { c: number }).c,
    });
  } finally { db.close(); }
}
