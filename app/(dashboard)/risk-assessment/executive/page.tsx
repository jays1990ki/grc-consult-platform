import Database from "better-sqlite3";
import path from "path";
import RiskMatrix from "@/components/risk/RiskMatrix";
import RadarChart from "@/components/risk/RadarChart";
import { ISO_CONTROLS, CATEGORY_NAMES, countByCategory } from "@/lib/iso-controls";
import { RISK_COLORS, type RiskLevel } from "@/lib/risk-utils";
import ExportPDFButton from "@/components/shared/ExportPDFButton";
import { DB_PATH } from "@/lib/db-path";

function getData() {
  try {
    const db = new Database(DB_PATH);

    // Risk level summary
    const levelCounts = db.prepare(
      "SELECT risk_level, COUNT(*) as count FROM risk_assessments GROUP BY risk_level"
    ).all() as { risk_level: string; count: number }[];

    // Matrix
    const matrixRows = db.prepare(
      "SELECT likelihood, impact, COUNT(*) as count FROM risk_assessments GROUP BY likelihood, impact"
    ).all() as { likelihood: number; impact: number; count: number }[];
    const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const r of matrixRows) {
      if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5)
        matrix[r.likelihood - 1][r.impact - 1] = r.count;
    }

    // Compliance scores
    const applied = db.prepare(
      "SELECT DISTINCT control_id FROM risk_control_mappings WHERE selected = 1"
    ).all() as { control_id: string }[];
    const appliedSet = new Set(applied.map(r => r.control_id));
    const totalByCategory = countByCategory();
    const complianceScores: Record<string, number> = {};
    const appliedByCategory: Record<string, number> = {};
    for (const c of ISO_CONTROLS) {
      if (appliedSet.has(c.id)) appliedByCategory[c.category] = (appliedByCategory[c.category] ?? 0) + 1;
    }
    for (const cat of ["A.5", "A.6", "A.7", "A.8"]) {
      complianceScores[cat] = Math.round(((appliedByCategory[cat] ?? 0) / (totalByCategory[cat] ?? 1)) * 100);
    }

    // Asset stats
    const assetTypeCounts = db.prepare(
      "SELECT type, COUNT(*) as count FROM risk_assets GROUP BY type"
    ).all() as { type: string; count: number }[];
    const totalAssets = (db.prepare("SELECT COUNT(*) as c FROM risk_assets").get() as { c: number }).c;
    const totalAssessments = (db.prepare("SELECT COUNT(*) as c FROM risk_assessments").get() as { c: number }).c;
    const totalControls = (db.prepare("SELECT COUNT(DISTINCT control_id) as c FROM risk_control_mappings WHERE selected=1").get() as { c: number }).c;

    // Top risks
    const topRisks = db.prepare(`
      SELECT ra.*, ras.name as asset_name FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      ORDER BY ra.inherent_risk DESC LIMIT 6
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
const TYPE_ICONS: Record<string, string> = { Hardware: "🖥️", Software: "⚙️", Data: "🗄️", People: "👥" };

export default function ExecutiveDashboardPage() {
  const { levelCounts, matrix, complianceScores, assetTypeCounts, totalAssets, totalAssessments, totalControls, topRisks } = getData();

  const countMap = Object.fromEntries(levelCounts.map(l => [l.risk_level, l.count]));
  const avgCompliance = Math.round(Object.values(complianceScores).reduce((s, v) => s + v, 0) / 4);

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Risk Assessment → <span className="text-gray-700 font-medium">Step 4: Executive Dashboard</span></p>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1">ภาพรวมความเสี่ยงและคะแนน ISO 27001:2022 Compliance Score</p>
        </div>
        <ExportPDFButton
          href="/api/pdf/risk-register?orgId=1"
          label="Export Risk Register PDF"
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
        />
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets",        val: totalAssets,        sub: "registered",     color: "bg-blue-600" },
          { label: "Total Assessments",   val: totalAssessments,   sub: "risk items",     color: "bg-purple-600" },
          { label: "Controls Applied",    val: totalControls,      sub: "unique controls","color": "bg-green-600" },
          { label: "Compliance Score",    val: `${avgCompliance}%`, sub: "overall avg",   color: "bg-orange-500" },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color.replace("bg-","text-")}`}>{val}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Risk level breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {(["Critical","Medium","Low"] as RiskLevel[]).map(level => {
          const c = RISK_COLORS[level];
          const count = countMap[level] ?? 0;
          return (
            <div key={level} className={`rounded-xl p-5 border-2 ${c.bg}`} style={{ borderColor: c.hex + "55" }}>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.badge}`}>{level}</span>
                <span className="text-xs text-gray-500">
                  {totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0}%
                </span>
              </div>
              <p className="text-4xl font-black mt-2" style={{ color: c.hex }}>{count}</p>
              <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${totalAssessments > 0 ? (count / totalAssessments) * 100 : 0}%`, background: c.hex }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Matrix + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-1">5×5 Risk Matrix</h2>
          <p className="text-xs text-gray-500 mb-5">สรุปจำนวนความเสี่ยงตาม Likelihood × Impact — ตัวเลขในช่องคือจำนวนความเสี่ยง</p>
          <RiskMatrix matrix={matrix} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Compliance Score Radar</h2>
          <p className="text-xs text-gray-500 mb-5">คะแนนความสอดคล้องตาม ISO 27001:2022 Annex A แต่ละหมวด</p>
          <RadarChart scores={complianceScores} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(complianceScores).map(([cat, score]) => (
              <div key={cat} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">{cat}</p>
                  <p className="text-xs text-gray-500">{CATEGORY_NAMES[cat]}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: score >= 70 ? "#22c55e" : score >= 40 ? "#f97316" : "#ef4444" }}>
                    {score}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset type breakdown + Top risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Asset Type Distribution</h2>
          <div className="space-y-3">
            {assetTypeCounts.map((t: any) => (
              <div key={t.type} className="flex items-center gap-3">
                <span className="text-xl">{TYPE_ICONS[t.type] ?? "📦"}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{t.type}</span>
                    <span className="text-gray-500">{t.count}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(t.count / totalAssets) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Top Risks by Score</h2>
          <div className="space-y-2">
            {topRisks.map((r: any, idx: number) => {
              const level = r.risk_level as RiskLevel;
              const c = RISK_COLORS[level] ?? RISK_COLORS.Low;
              return (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-bold text-gray-400 w-5">#{idx + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${c.badge}`}>{level}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.threat_name}</p>
                    <p className="text-xs text-gray-500">{r.asset_name}</p>
                  </div>
                  <span className="text-lg font-black shrink-0" style={{ color: c.hex }}>
                    {Number(r.inherent_risk).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
