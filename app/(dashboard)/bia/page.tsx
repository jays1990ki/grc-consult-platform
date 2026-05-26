import Database from "better-sqlite3";
import path from "path";
import BiaMain, { type ProcessRow, type AssetOption } from "@/components/bia/BiaMain";

const ORG_ID = 1;

function getData(): { processes: ProcessRow[]; assets: AssetOption[] } {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    db.pragma("journal_mode = WAL");

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
      ORDER BY bp.created_at DESC
    `).all(ORG_ID) as ProcessRow[];

    const assets = db.prepare(`
      SELECT id, name, type FROM risk_assets ORDER BY name ASC
    `).all() as AssetOption[];

    db.close();
    return { processes, assets };
  } catch {
    return { processes: [], assets: [] };
  }
}

export default function BiaPage() {
  const { processes, assets } = getData();

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          GRC Platform → <span className="text-gray-700 font-medium">Business Impact Analysis (BIA)</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Business Impact Analysis</h1>
        <p className="text-gray-500 mt-1">
          วิเคราะห์ผลกระทบของกระบวนการทางธุรกิจ กำหนด RTO/RPO และระดับความสำคัญ
        </p>
      </div>

      <BiaMain initialProcesses={processes} riskAssets={assets} orgId={ORG_ID} />
    </div>
  );
}
