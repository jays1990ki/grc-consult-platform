import Database from "better-sqlite3";
import path from "path";
import TreatmentPanel, { type RiskRow } from "@/components/risk/TreatmentPanel";
import Link from "next/link";
import { Kanban, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import ExportPDFButton from "@/components/shared/ExportPDFButton";
import { DB_PATH } from "@/lib/db-path";


const ORG_ID = 1;

function getData() {
  try {
    const db = new Database(DB_PATH);

    const risks = db.prepare(`
      SELECT ra.id, ra.threat_name, ra.inherent_risk, ra.risk_level,
             ra.likelihood, ra.impact,
             ras.name AS asset_name, ras.type AS asset_type,
             ra.organization_id,
             rt.status AS treatment_status,
             rt.treatment_option
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      LEFT JOIN risk_treatments rt ON rt.risk_id = ra.id AND rt.organization_id = ra.organization_id
      WHERE ra.inherent_risk >= 25
        AND ra.organization_id = ?
      ORDER BY ra.inherent_risk DESC
    `).all(ORG_ID) as any[];

    const stats = {
      total:      risks.length,
      treated:    risks.filter((r: any) => r.treatment_status).length,
      done:       risks.filter((r: any) => r.treatment_status === "Done" || r.treatment_status === "Accepted by Management").length,
      critical:   risks.filter((r: any) => r.risk_level === "Critical").length,
    };

    db.close();
    return { risks, stats };
  } catch { return { risks: [], stats: { total: 0, treated: 0, done: 0, critical: 0 } }; }
}

export default function TreatmentPlanPage() {
  const { risks, stats } = getData();

  const critical = risks.filter((r: any) => r.risk_level === "Critical");
  const medium   = risks.filter((r: any) => r.risk_level === "Medium");

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            Risk Assessment → <span className="text-gray-700 font-medium">Treatment Plan</span>
          </p>
          <h1 className="text-2xl font-bold text-gray-900">แผนการจัดการความเสี่ยง</h1>
          <p className="text-gray-500 mt-1 text-sm">
            กำหนดแนวทางการจัดการ (Mitigate / Transfer / Avoid / Accept)
            สำหรับความเสี่ยงที่มีคะแนน ≥ 25
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportPDFButton
            href="/api/pdf/treatment-plan?orgId=1"
            label="Export Treatment Plan PDF"
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          />
          <Link href="/risk-treatment/kanban"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            <Kanban size={16} />
            Kanban Board
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ความเสี่ยงทั้งหมด",   val: stats.total,    icon: AlertTriangle, color: "text-gray-700",   bg: "bg-gray-50   border-gray-200" },
          { label: "Critical",              val: stats.critical, icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50    border-red-200" },
          { label: "มีแผนแล้ว",            val: stats.treated,  icon: Clock,         color: "text-blue-600",   bg: "bg-blue-50   border-blue-200" },
          { label: "เสร็จสิ้น / อนุมัติ", val: stats.done,     icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50  border-green-200" },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <Icon size={18} className={`${color} mb-2`} />
            <p className={`text-2xl font-black ${color}`}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Risk list */}
      {risks.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center space-y-2">
          <p className="text-4xl">✅</p>
          <p className="font-semibold text-gray-700">ไม่มีความเสี่ยงระดับ Medium หรือ Critical</p>
          <Link href="/risk-assessment/assess" className="inline-block text-blue-600 text-sm hover:underline">
            ← กลับไปประเมินความเสี่ยง
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {critical.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <h2 className="font-bold text-gray-900">Critical Risks ({critical.length})</h2>
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  ต้องมีแผนทันที
                </span>
              </div>
              <div className="space-y-2">
                {critical.map((r: any) => (
                  <TreatmentPanel key={r.id} risk={r as RiskRow} orgId={ORG_ID} />
                ))}
              </div>
            </section>
          )}

          {medium.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <h2 className="font-bold text-gray-900">Medium Risks ({medium.length})</h2>
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  วางแผนภายใน 30 วัน
                </span>
              </div>
              <div className="space-y-2">
                {medium.map((r: any) => (
                  <TreatmentPanel key={r.id} risk={r as RiskRow} orgId={ORG_ID} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/risk-treatment/kanban"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
          <Kanban size={15} /> View Kanban Board →
        </Link>
      </div>
    </div>
  );
}
