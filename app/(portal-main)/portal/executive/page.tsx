import Database from "better-sqlite3";
import path from "path";
import { requireModuleAccess } from "@/lib/portal-auth";
import PermissionDenied from "@/components/portal/PermissionDenied";
import RiskMatrix from "@/components/risk/RiskMatrix";
import RadarChart from "@/components/risk/RadarChart";
import { ISO_CONTROLS, CATEGORY_NAMES, countByCategory } from "@/lib/iso-controls";
import { RISK_COLORS, type RiskLevel } from "@/lib/risk-utils";
import { DB_PATH } from "@/lib/db-path";

function getData() {
  try {
    const db = new Database(DB_PATH);

    const levelCounts = db.prepare(
      "SELECT risk_level, COUNT(*) as count FROM risk_assessments GROUP BY risk_level"
    ).all() as { risk_level: string; count: number }[];

    const matrixRows = db.prepare(
      "SELECT likelihood, impact, COUNT(*) as count FROM risk_assessments GROUP BY likelihood, impact"
    ).all() as { likelihood: number; impact: number; count: number }[];
    const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const r of matrixRows) {
      if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5)
        matrix[r.likelihood - 1][r.impact - 1] = r.count;
    }

    const applied = db.prepare(
      "SELECT DISTINCT control_id FROM risk_control_mappings WHERE selected=1"
    ).all() as { control_id: string }[];
    const appliedSet = new Set(applied.map(r => r.control_id));
    const totalByCategory = countByCategory();
    const appliedByCategory: Record<string, number> = {};
    for (const c of ISO_CONTROLS) {
      if (appliedSet.has(c.id)) appliedByCategory[c.category] = (appliedByCategory[c.category] ?? 0) + 1;
    }
    const complianceScores: Record<string, number> = {};
    for (const cat of ["A.5", "A.6", "A.7", "A.8"]) {
      complianceScores[cat] = Math.round(((appliedByCategory[cat] ?? 0) / (totalByCategory[cat] ?? 1)) * 100);
    }

    const assetTypeCounts = db.prepare(
      "SELECT type, COUNT(*) as count FROM risk_assets GROUP BY type"
    ).all() as { type: string; count: number }[];
    const totalAssets = (db.prepare("SELECT COUNT(*) as c FROM risk_assets").get() as any).c;
    const totalAssessments = (db.prepare("SELECT COUNT(*) as c FROM risk_assessments").get() as any).c;
    const totalControls = (db.prepare("SELECT COUNT(DISTINCT control_id) as c FROM risk_control_mappings WHERE selected=1").get() as any).c;
    const topRisks = db.prepare(`
      SELECT ra.*, ras.name as asset_name FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      ORDER BY ra.inherent_risk DESC LIMIT 5
    `).all() as any[];

    db.close();
    return { levelCounts, matrix, complianceScores, assetTypeCounts, totalAssets, totalAssessments, totalControls, topRisks };
  } catch {
    return {
      levelCounts: [], matrix: Array.from({ length: 5 }, () => Array(5).fill(0)),
      complianceScores: { "A.5": 0, "A.6": 0, "A.7": 0, "A.8": 0 },
      assetTypeCounts: [], totalAssets: 0, totalAssessments: 0, totalControls: 0, topRisks: [],
    };
  }
}

const LEVEL_ICONS: Record<string, string> = { Critical: "🔴", Medium: "🟠", Low: "🟢" };
const TYPE_ICONS: Record<string, string>  = { Hardware: "🖥️", Software: "⚙️", Data: "🗄️", People: "👥" };

export default async function PortalExecutivePage() {
  const { noAccess } = await requireModuleAccess("executive");
  if (noAccess) return <PermissionDenied moduleName="Executive Dashboard" moduleTh="แดชบอร์ดสรุปผล" />;

  const { levelCounts, matrix, complianceScores, assetTypeCounts, totalAssets, totalAssessments, totalControls, topRisks } = getData();
  const countMap = Object.fromEntries(levelCounts.map(l => [l.risk_level, l.count]));
  const avgCompliance = Math.round(Object.values(complianceScores).reduce((s, v) => s + v, 0) / 4);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        </div>
        <p className="text-gray-500 text-sm">ภาพรวมความเสี่ยงและคะแนน ISO 27001:2022 Compliance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "สินทรัพย์",          val: totalAssets,        color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "การประเมินความเสี่ยง", val: totalAssessments,  color: "text-purple-600", bg: "bg-purple-50" },
          { label: "มาตรการที่ใช้",        val: totalControls,      color: "text-green-600",  bg: "bg-green-50" },
          { label: "Overall Compliance",   val: `${avgCompliance}%`, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 border border-transparent`}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {(["Critical","Medium","Low"] as RiskLevel[]).map(level => {
          const c = RISK_COLORS[level];
          const count = countMap[level] ?? 0;
          return (
            <div key={level} className={`rounded-xl p-5 border-2 ${c.bg}`} style={{ borderColor: c.hex + "55" }}>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.badge}`}>{level}</span>
              <p className="text-4xl font-black mt-2" style={{ color: c.hex }}>{count}</p>
              <div className="mt-2 bg-white bg-opacity-60 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${totalAssessments > 0 ? (count / totalAssessments) * 100 : 0}%`, background: c.hex }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">5×5 Risk Matrix</h2>
          <p className="text-xs text-gray-500 mb-4">จำนวนความเสี่ยงตาม Likelihood × Impact</p>
          <RiskMatrix matrix={matrix} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Compliance Score Radar</h2>
          <p className="text-xs text-gray-500 mb-4">คะแนนความสอดคล้อง ISO 27001:2022 แต่ละหมวด</p>
          <RadarChart scores={complianceScores} />
        </div>
      </div>

      {/* Top risks */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">Top 5 Risks</h2>
        <div className="space-y-2">
          {topRisks.map((r: any, i: number) => {
            const level = r.risk_level as RiskLevel;
            const c = RISK_COLORS[level] ?? RISK_COLORS.Low;
            return (
              <div key={r.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${c.badge}`}>{level}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.threat_name}</p>
                  <p className="text-xs text-gray-500">{r.asset_name}</p>
                </div>
                <p className="text-lg font-black shrink-0" style={{ color: c.hex }}>
                  {Number(r.inherent_risk).toFixed(0)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
