import Database from "better-sqlite3";
import path from "path";
import ControlSelector from "@/components/risk/ControlSelector";
import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";

const ORG_ID = 1; // v0.6: single-org default; extend via session when multi-tenant

function getData() {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));

    const assessments = db.prepare(`
      SELECT ra.*, ras.name as asset_name, ras.type as asset_type
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      WHERE ra.risk_level IN ('Critical','Medium')
        AND ra.organization_id = ?
      ORDER BY ra.inherent_risk DESC
    `).all(ORG_ID) as any[];

    const libStats = db.prepare(`
      SELECT COUNT(*) as total FROM control_library WHERE organization_id = ?
    `).get(ORG_ID) as { total: number };

    const appliedStats = db.prepare(`
      SELECT COUNT(DISTINCT rcm.control_id) as applied
      FROM risk_control_mappings rcm
      JOIN risk_assessments ra ON ra.id = rcm.assessment_id
      JOIN control_library cl  ON cl.control_id = rcm.control_id AND cl.organization_id = ra.organization_id
      WHERE rcm.selected = 1 AND ra.organization_id = ?
    `).get(ORG_ID) as { applied: number };

    db.close();
    return { assessments, libTotal: libStats.total, libApplied: appliedStats.applied };
  } catch {
    return { assessments: [], libTotal: 0, libApplied: 0 };
  }
}

export default function ControlsPage() {
  const { assessments, libTotal, libApplied } = getData();
  const critical = assessments.filter((a: any) => a.risk_level === "Critical");
  const medium   = assessments.filter((a: any) => a.risk_level === "Medium");
  const libPct   = libTotal > 0 ? Math.round((libApplied / libTotal) * 100) : 0;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Risk Assessment → <span className="text-gray-700 font-medium">Step 3: Control Mapping</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">จับคู่มาตรการควบคุม</h1>
        <p className="text-gray-500 mt-1">
          เลือกมาตรการ ISO 27001:2022 Annex A สำหรับความเสี่ยงระดับ Critical และ Medium
        </p>
      </div>

      {/* Control Library Status Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
        <div className="bg-amber-100 rounded-lg p-2 shrink-0">
          <BookOpen size={20} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-amber-900 text-sm">ISO 27001:2022 Control Library</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {libTotal} controls available · {libApplied} applied · Version 0.6
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-black text-amber-700">{libPct}%</p>
                <p className="text-xs text-amber-600">Library Coverage</p>
              </div>
              <div className="w-16 h-16 relative shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fde68a" strokeWidth="3.2" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#d97706" strokeWidth="3.2"
                    strokeDasharray={`${libPct} ${100 - libPct}`} strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${libPct}%` }} />
          </div>
        </div>
      </div>

      {/* Threshold legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-3 flex-wrap">
        <ShieldCheck size={14} className="text-blue-500 shrink-0" />
        <span>
          <strong>Control Threshold:</strong> Score ≥ 25 (Medium+) → แสดงแผง "Suggested Controls"
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-400 rounded-full inline-block" />
          Suggested (Consultant Review Required)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded-full inline-block" />
          ISO Annex A Library
        </span>
      </div>

      {/* Risk lists */}
      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center space-y-3">
          <p className="text-4xl">✅</p>
          <p className="font-semibold text-gray-700">ไม่มีความเสี่ยงระดับ Critical หรือ Medium</p>
          <p className="text-sm text-gray-500">ความเสี่ยงทั้งหมดอยู่ในระดับ Low หรือยังไม่มีการประเมิน</p>
          <Link href="/risk-assessment/assess"
            className="inline-block text-blue-600 text-sm font-semibold hover:underline mt-2">
            ← กลับไปประเมินความเสี่ยง
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {critical.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <h2 className="font-bold text-gray-900">Critical Risks ({critical.length})</h2>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">ต้องดำเนินการทันที</span>
              </div>
              <div className="space-y-2">
                {critical.map((a: any) => (
                  <ControlSelector key={a.id} assessment={{ ...a, organization_id: ORG_ID }} />
                ))}
              </div>
            </section>
          )}

          {medium.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                <h2 className="font-bold text-gray-900">Medium Risks ({medium.length})</h2>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">ควรดำเนินการภายใน 30 วัน</span>
              </div>
              <div className="space-y-2">
                {medium.map((a: any) => (
                  <ControlSelector key={a.id} assessment={{ ...a, organization_id: ORG_ID }} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/risk-assessment/executive"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
          Step 4: Executive Dashboard →
        </Link>
      </div>
    </div>
  );
}
