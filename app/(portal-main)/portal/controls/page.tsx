import Database from "better-sqlite3";
import path from "path";
import { requireModuleAccess } from "@/lib/portal-auth";
import PermissionDenied from "@/components/portal/PermissionDenied";
import ControlSelector from "@/components/risk/ControlSelector";
import { RISK_COLORS } from "@/lib/risk-utils";
import Link from "next/link";

function getData() {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    const all = db.prepare(`
      SELECT ra.*, ras.name as asset_name, ras.type as asset_type
      FROM risk_assessments ra
      JOIN risk_assets ras ON ras.id = ra.asset_id
      WHERE ra.risk_level IN ('Critical','Medium')
      ORDER BY ra.inherent_risk DESC
    `).all() as any[];
    db.close();
    return all;
  } catch { return []; }
}

export default async function PortalControlsPage() {
  const { noAccess, canEdit } = await requireModuleAccess("controls");
  if (noAccess) return <PermissionDenied moduleName="Control Mapping" moduleTh="จับคู่มาตรการควบคุม" />;

  const assessments = getData();
  const critical = assessments.filter((a: any) => a.risk_level === "Critical");
  const medium   = assessments.filter((a: any) => a.risk_level === "Medium");

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-2xl font-bold text-gray-900">จับคู่มาตรการควบคุม</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${canEdit ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
            {canEdit ? "✏️ Edit" : "👁️ View Only"}
          </span>
        </div>
        <p className="text-gray-500 text-sm">ISO 27001:2022 Annex A — มาตรการสำหรับความเสี่ยงระดับ Critical และ Medium</p>
      </div>

      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          👁️ คุณมีสิทธิ์ดูมาตรการที่เลือกไว้เท่านั้น — ติดต่อ Admin เพื่อขอสิทธิ์แก้ไข
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center space-y-3">
          <p className="text-4xl">✅</p>
          <p className="font-semibold text-gray-700">ไม่มีความเสี่ยงระดับ Critical หรือ Medium</p>
          <Link href="/portal/assess" className="inline-block text-blue-600 text-sm font-semibold hover:underline">
            ← ไปประเมินความเสี่ยง
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {critical.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <h2 className="font-bold text-gray-900">Critical Risks ({critical.length})</h2>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">ต้องดำเนินการทันที</span>
              </div>
              <div className="space-y-2">
                {critical.map((a: any) => <ControlSelector key={a.id} assessment={a} />)}
              </div>
            </section>
          )}
          {medium.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <h2 className="font-bold text-gray-900">Medium Risks ({medium.length})</h2>
                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">ดำเนินการภายใน 30 วัน</span>
              </div>
              <div className="space-y-2">
                {medium.map((a: any) => <ControlSelector key={a.id} assessment={a} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
