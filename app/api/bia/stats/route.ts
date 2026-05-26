import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** GET /api/bia/stats?orgId=1 */
export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    const total = (db.prepare(
      "SELECT COUNT(*) AS c FROM business_processes WHERE organization_id = ?"
    ).get(org) as any).c as number;

    const byPriority = db.prepare(
      "SELECT priority_level, COUNT(*) AS count FROM business_processes WHERE organization_id = ? GROUP BY priority_level"
    ).all(org) as { priority_level: string; count: number }[];

    const pMap = Object.fromEntries(byPriority.map(r => [r.priority_level, r.count]));

    const avgRtoRow = db.prepare(
      "SELECT AVG(rto) AS avg_rto FROM business_processes WHERE organization_id = ? AND rto IS NOT NULL"
    ).get(org) as any;

    const financialRow = db.prepare(`
      SELECT SUM(bis.financial_loss_per_hour) AS total_per_hour
      FROM bia_impact_scores bis
      JOIN business_processes bp ON bp.id = bis.process_id
      WHERE bis.organization_id = ?
    `).get(org) as any;

    // Critical processes with linked assets (for warning)
    const criticalWithAssets = db.prepare(`
      SELECT id, process_name, related_assets
      FROM business_processes
      WHERE organization_id = ? AND priority_level = 'Critical'
        AND related_assets != '[]' AND related_assets IS NOT NULL
    `).all(org) as any[];

    let linkedAssetIds: number[] = [];
    for (const p of criticalWithAssets) {
      try {
        const ids: number[] = JSON.parse(p.related_assets);
        linkedAssetIds.push(...ids);
      } catch { /* skip */ }
    }
    const uniqueLinkedAssets = Array.from(new Set(linkedAssetIds)).length;

    return NextResponse.json({
      total,
      critical:    pMap["Critical"] ?? 0,
      high:        pMap["High"]     ?? 0,
      medium:      pMap["Medium"]   ?? 0,
      low:         pMap["Low"]      ?? 0,
      avgRto:      avgRtoRow?.avg_rto ? Math.round(Number(avgRtoRow.avg_rto)) : null,
      totalLossPerDay: financialRow?.total_per_hour
        ? Math.round(Number(financialRow.total_per_hour) * 24)
        : 0,
      linkedAssets: uniqueLinkedAssets,
    });
  } finally { db.close(); }
}
