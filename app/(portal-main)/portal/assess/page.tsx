import Database from "better-sqlite3";
import path from "path";
import { requireModuleAccess } from "@/lib/portal-auth";
import PermissionDenied from "@/components/portal/PermissionDenied";
import AssessmentForm from "@/components/risk/AssessmentForm";
import { RISK_COLORS, type RiskLevel } from "@/lib/risk-utils";
import Link from "next/link";

function getData() {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
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

export default async function PortalAssessPage() {
  const { noAccess, canEdit } = await requireModuleAccess("assess");
  if (noAccess) return <PermissionDenied moduleName="Risk Assessment" moduleTh="ประเมินความเสี่ยง" />;

  const { assets, assessments } = getData();
  const counts = { Critical: 0, Medium: 0, Low: 0 };
  for (const a of assessments) counts[a.risk_level as RiskLevel] = (counts[a.risk_level as RiskLevel] ?? 0) + 1;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">⚖️</span>
          <h1 className="text-2xl font-bold text-gray-900">ประเมินความเสี่ยง</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${canEdit ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
            {canEdit ? "✏️ Edit" : "👁️ View Only"}
          </span>
        </div>
        <p className="text-gray-500 text-sm">Inherent Risk = Likelihood × Impact × Asset Value</p>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-3 gap-4">
        {(["Critical","Medium","Low"] as RiskLevel[]).map(level => (
          <div key={level} className={`rounded-xl p-4 border ${RISK_COLORS[level].bg}`}
            style={{ borderColor: RISK_COLORS[level].hex + "44" }}>
            <p className="text-2xl font-black" style={{ color: RISK_COLORS[level].hex }}>{counts[level]}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">{LEVEL_ICONS[level]} {level}</p>
          </div>
        ))}
      </div>

      <div className={`grid gap-8 ${canEdit ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1"}`}>
        {/* New assessment form — edit only */}
        {canEdit && (
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5">ประเมินความเสี่ยงใหม่</h2>
            {assets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">ยังไม่มีสินทรัพย์</p>
                <Link href="/portal/assets" className="mt-2 inline-block text-blue-600 text-sm font-semibold hover:underline">
                  → ลงทะเบียนสินทรัพย์ก่อน
                </Link>
              </div>
            ) : (
              <AssessmentForm assets={assets} />
            )}
          </div>
        )}

        {/* Assessment list */}
        <div className={canEdit ? "xl:col-span-3 space-y-3" : "space-y-3"}>
          <h2 className="font-semibold text-gray-900">ผลการประเมินทั้งหมด ({assessments.length})</h2>
          {assessments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400 text-sm">ยังไม่มีการประเมินความเสี่ยง</p>
            </div>
          ) : (
            assessments.map((a: any) => {
              const level = a.risk_level as RiskLevel;
              const c = RISK_COLORS[level] ?? RISK_COLORS.Low;
              return (
                <div key={a.id} className={`rounded-xl p-4 border ${c.bg}`}
                  style={{ borderLeft: `4px solid ${c.hex}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.badge}`}>
                          {LEVEL_ICONS[level]} {level}
                        </span>
                        <span className="text-xs text-gray-500">{a.asset_name} ({a.asset_type})</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{a.threat_name}</p>
                      {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black" style={{ color: c.hex }}>
                        {Number(a.inherent_risk).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">L:{a.likelihood} × I:{a.impact}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
