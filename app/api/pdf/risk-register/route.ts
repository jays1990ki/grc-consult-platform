import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { RiskRegisterPDF, type RiskRegisterData } from "@/components/pdf/RiskRegisterPDF";
import { getSession } from "@/lib/auth/session";
import { ISO_CONTROLS, countByCategory } from "@/lib/iso-controls";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

function orgId(req: NextRequest): number {
  return Number(
    req.headers.get("x-org-id") ??
    new URL(req.url).searchParams.get("orgId") ??
    1
  );
}

function getOrgName(db: ReturnType<typeof getDb>, org: number): string {
  try {
    const row = db.prepare("SELECT name FROM organizations WHERE id = ?").get(org) as any;
    return row?.name ?? "CAT INFONET";
  } catch { return "CAT INFONET"; }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();

  try {
    const orgName = getOrgName(db, org);
    const now = new Date();
    const generatedAt = now.toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // ── Stats ────────────────────────────────────────────────────────────────
    const totalAssets = (db.prepare(
      "SELECT COUNT(*) AS c FROM risk_assets WHERE organization_id = ?"
    ).get(org) as any).c as number;

    const levelRows = db.prepare(
      "SELECT risk_level, COUNT(*) AS count FROM risk_assessments WHERE organization_id = ? GROUP BY risk_level"
    ).all(org) as { risk_level: string; count: number }[];
    const lvMap = Object.fromEntries(levelRows.map(r => [r.risk_level, r.count]));

    const totalAssessments = (db.prepare(
      "SELECT COUNT(*) AS c FROM risk_assessments WHERE organization_id = ?"
    ).get(org) as any).c as number;

    // Compliance %
    const applied = db.prepare(
      "SELECT DISTINCT control_id FROM risk_control_mappings WHERE selected = 1 AND organization_id = ?"
    ).all(org) as { control_id: string }[];
    const appliedSet = new Set(applied.map(r => r.control_id));
    const totalByCategory = countByCategory();
    let totalControls = 0, appliedControls = 0;
    for (const cat of ["A.5", "A.6", "A.7", "A.8"]) {
      totalControls   += totalByCategory[cat] ?? 0;
      appliedControls += Array.from(appliedSet).filter(id => id.startsWith(cat)).length;
    }
    const avgCompliance = totalControls > 0 ? Math.round((appliedControls / totalControls) * 100) : 0;

    // ── Risk rows ────────────────────────────────────────────────────────────
    const risks = db.prepare(`
      SELECT ra.id, ra.threat_name, ra.likelihood, ra.impact,
             ra.inherent_risk, ra.risk_level,
             ras.name AS asset_name,
             COALESCE(ctrl.cnt, 0) AS controls_count,
             rt.status AS treatment_status
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      LEFT JOIN (
        SELECT risk_assessment_id, COUNT(DISTINCT control_id) AS cnt
        FROM risk_control_mappings WHERE selected = 1
        GROUP BY risk_assessment_id
      ) ctrl ON ctrl.risk_assessment_id = ra.id
      LEFT JOIN risk_treatments rt ON rt.risk_id = ra.id AND rt.organization_id = ra.organization_id
      WHERE ra.organization_id = ?
      ORDER BY ra.inherent_risk DESC
    `).all(org) as any[];

    // ── Matrix points ─────────────────────────────────────────────────────────
    const matrixPoints = db.prepare(`
      SELECT likelihood, impact, COUNT(*) AS count
      FROM risk_assessments WHERE organization_id = ?
      GROUP BY likelihood, impact
    `).all(org) as { likelihood: number; impact: number; count: number }[];

    const data: RiskRegisterData = {
      orgName,
      generatedAt,
      stats: {
        totalAssets,
        totalAssessments,
        critical:       lvMap["Critical"] ?? 0,
        medium:         lvMap["Medium"]   ?? 0,
        low:            lvMap["Low"]      ?? 0,
        avgCompliance,
      },
      risks,
      matrixPoints,
    };

    const buffer = await renderToBuffer(React.createElement(RiskRegisterPDF, { data }) as React.ReactElement<any>);

    const filename = `risk-register-${now.toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } finally { db.close(); }
}
