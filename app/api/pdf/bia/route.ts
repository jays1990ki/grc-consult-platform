import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BiaPDF, type BiaReportData, type BiaProcessData } from "@/components/pdf/BiaPDF";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();

  try {
    // Fetch all processes with impact scores
    const processes = db.prepare(`
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
      ORDER BY
        CASE bp.priority_level
          WHEN 'Critical' THEN 1
          WHEN 'High'     THEN 2
          WHEN 'Medium'   THEN 3
          ELSE 4
        END,
        bp.created_at DESC
    `).all(org) as BiaProcessData[];

    // Aggregate stats
    const total = processes.length;
    const pMap  = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
    let rtoSum = 0, rtoCount = 0, lossSum = 0;
    const allLinkedAssets = new Set<number>();

    for (const p of processes) {
      pMap[p.priority_level] = (pMap[p.priority_level] ?? 0) + 1;
      if (p.rto !== null) { rtoSum += p.rto; rtoCount++; }
      if (p.has_impact && p.financial_loss_per_hour) {
        lossSum += p.financial_loss_per_hour;
      }
      if (p.priority_level === "Critical") {
        // p.related_assets is a raw DB row — might be string
        try {
          const ids: number[] = JSON.parse((p as any).related_assets ?? "[]");
          ids.forEach(id => allLinkedAssets.add(id));
        } catch { /* skip */ }
      }
    }

    const stats = {
      total,
      critical: pMap["Critical"] ?? 0,
      high:     pMap["High"]     ?? 0,
      medium:   pMap["Medium"]   ?? 0,
      low:      pMap["Low"]      ?? 0,
      avgRto:   rtoCount > 0 ? Math.round(rtoSum / rtoCount) : null,
      totalLossPerDay: Math.round(lossSum * 24),
      linkedAssets: allLinkedAssets.size,
    };

    // Org name
    const orgRow = db.prepare(
      "SELECT name FROM organizations WHERE id = ? LIMIT 1"
    ).get(org) as any;
    const orgName = orgRow?.name ?? "CAT INFONET";

    const reportData: BiaReportData = {
      orgName,
      generatedAt: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      processes,
      stats,
    };

    const buffer = await renderToBuffer(
      React.createElement(BiaPDF, { data: reportData }) as React.ReactElement<any>
    );

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BIA-Report-${date}.pdf"`,
      },
    });
  } finally {
    db.close();
  }
}
