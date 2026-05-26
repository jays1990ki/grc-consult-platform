import Database from "better-sqlite3";
import path from "path";
import AssessmentForm from "@/components/risk/AssessmentForm";
import { RISK_COLORS, type RiskLevel } from "@/lib/risk-utils";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { DB_PATH } from "@/lib/db-path";

function getData() {
  try {
    const db = new Database(DB_PATH);
    const assets = db.prepare("SELECT * FROM risk_assets ORDER BY name").all() as any[];
    const assessments = db.prepare(`
      SELECT ra.*, ras.name as asset_name, ras.type as asset_type
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      ORDER BY ra.inherent_risk DESC
    `).all() as any[];
    db.close();
    return { assets, assessments };
  } catch { return { assets: [], assessments: [] }; }
}

const LEVEL_ICONS: Record<string, string> = { Critical: "🔴", Medium: "🟠", Low: "🟢" };

export default function AssessPage() {
  const { assets, assessments } = getData();

  const counts = { Critical: 0, Medium: 0, Low: 0 };
  for (const a of assessments) counts[a.risk_level as RiskLevel] = (counts[a.risk_level as RiskLevel] ?? 0) + 1;

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <p className="text-xs text-gray-400 mb-1">Risk Assessment → <span className="text-gray-700 font-medium">Step 2: Risk Assessment</span></p>
        <h1 className="text-2xl font-bold text-gray-900">ประเมินความเสี่ยง</h1>
        <p className="text-gray-500 mt-1">กำหนด Likelihood & Impact — ระบบคำนวณ Inherent Risk อัตโนมัติพร้อมแสดงสีเตือน</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["Critical","Medium","Low"] as RiskLevel[]).map(level => (
          <div key={level} className={`rounded-xl p-4 border ${RISK_COLORS[level].bg} border-opacity-30`}
            style={{ borderColor: RISK_COLORS[level].hex + "44" }}>
            <p className="text-2xl font-black" style={{ color: RISK_COLORS[level].hex }}>{counts[level]}</p>
            <p className="text-sm font-semibold text-gray-700">{LEVEL_ICONS[level]} {level}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Form */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">ประเมินความเสี่ยงใหม่</h2>
          {assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">ยังไม่มีสินทรัพย์</p>
              <Link href="/risk-assessment/assets" className="mt-2 inline-block text-blue-600 text-sm font-semibold hover:underline">
                → ลงทะเบียนสินทรัพย์ก่อน
              </Link>
            </div>
          ) : (
            <AssessmentForm assets={assets} />
          )}
        </div>

        {/* Assessment list */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">ผลการประเมินทั้งหมด ({assessments.length})</h2>
            <Link href="/risk-assessment/controls" className="text-sm text-blue-600 font-semibold hover:underline">
              Step 3: Map Controls →
            </Link>
          </div>

          {assessments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400 text-sm">ยังไม่มีการประเมินความเสี่ยง</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assessments.map((a: any) => {
                const level = a.risk_level as RiskLevel;
                const colors = RISK_COLORS[level] ?? RISK_COLORS.Low;
                return (
                  <div key={a.id} className={`rounded-xl p-4 border ${colors.bg}`}
                    style={{ borderLeft: `4px solid ${colors.hex}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                            {LEVEL_ICONS[level]} {level}
                          </span>
                          <span className="text-xs text-gray-500">{a.asset_name} ({a.asset_type})</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mt-1">{a.threat_name}</p>
                        {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black" style={{ color: colors.hex }}>
                          {Number(a.inherent_risk).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">L:{a.likelihood} × I:{a.impact}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
