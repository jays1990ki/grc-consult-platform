import Database from "better-sqlite3";
import path from "path";
import { requireModuleAccess } from "@/lib/portal-auth";
import PermissionDenied from "@/components/portal/PermissionDenied";
import AssetRegistrationForm from "@/components/risk/AssetRegistrationForm";
import { formatDate } from "@/lib/utils";
import { DB_PATH } from "@/lib/db-path";

function getAssets() {
  try {
    const db = new Database(DB_PATH);
    const rows = db.prepare(`
      SELECT ra.*, (SELECT COUNT(*) FROM risk_assessments WHERE asset_id = ra.id) as assessment_count
      FROM risk_assets ra ORDER BY ra.created_at DESC
    `).all() as any[];
    db.close();
    return rows;
  } catch { return []; }
}

const TYPE_ICONS: Record<string, string>  = { Hardware: "🖥️", Software: "⚙️", Data: "🗄️", People: "👥" };
const TYPE_COLORS: Record<string, string> = {
  Hardware: "bg-blue-100 text-blue-700",
  Software: "bg-purple-100 text-purple-700",
  Data:     "bg-green-100 text-green-700",
  People:   "bg-orange-100 text-orange-700",
};

export default async function PortalAssetsPage() {
  const { noAccess, canEdit } = await requireModuleAccess("assets");
  if (noAccess) return <PermissionDenied moduleName="Asset Registration" moduleTh="ลงทะเบียนสินทรัพย์" />;

  const assets = getAssets();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🗄️</span>
            <h1 className="text-2xl font-bold text-gray-900">ลงทะเบียนสินทรัพย์</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${canEdit ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {canEdit ? "✏️ Edit" : "👁️ View Only"}
            </span>
          </div>
          <p className="text-gray-500 text-sm">ระบุสินทรัพย์และประเมิน CIA Triad เพื่อคำนวณ Asset Value</p>
        </div>
      </div>

      <div className={`grid gap-8 ${canEdit ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1"}`}>
        {/* Registration form — only if can_edit */}
        {canEdit && (
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5">เพิ่มสินทรัพย์ใหม่</h2>
            <AssetRegistrationForm />
          </div>
        )}

        {/* Asset list */}
        <div className={canEdit ? "xl:col-span-3 space-y-4" : "space-y-4"}>
          <h2 className="font-semibold text-gray-900">สินทรัพย์ทั้งหมด ({assets.length})</h2>
          {assets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400 text-sm">ยังไม่มีสินทรัพย์ที่ลงทะเบียน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.map((a: any) => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl mt-0.5">{TYPE_ICONS[a.type] ?? "📦"}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{a.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-700">{Number(a.asset_value).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">AV</p>
                    </div>
                  </div>
                  {a.description && <p className="text-xs text-gray-500 mb-3">{a.description}</p>}
                  <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
                    {[
                      { l: "C", v: a.confidentiality, cls: "bg-blue-50 text-blue-700" },
                      { l: "I", v: a.integrity,       cls: "bg-purple-50 text-purple-700" },
                      { l: "A", v: a.availability,    cls: "bg-orange-50 text-orange-700" },
                      { l: "Risks", v: a.assessment_count, cls: "bg-gray-50 text-gray-600" },
                    ].map(({ l, v, cls }) => (
                      <div key={l} className={`rounded-lg py-1.5 font-semibold ${cls}`}>
                        <p className="text-base font-bold">{v}</p>
                        <p className="opacity-70 text-xs">{l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{a.owner && `👤 ${a.owner} · `}{formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
