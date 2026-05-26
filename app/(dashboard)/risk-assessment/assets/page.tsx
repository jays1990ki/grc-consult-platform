import Database from "better-sqlite3";
import path from "path";
import AssetRegistrationForm from "@/components/risk/AssetRegistrationForm";
import { formatDate } from "@/lib/utils";

interface CriticalBiaLink {
  processName: string;
  assetIds: number[];
}

function getAssets() {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    const rows = db.prepare(`
      SELECT ra.*, (SELECT COUNT(*) FROM risk_assessments WHERE asset_id = ra.id) as assessment_count
      FROM risk_assets ra ORDER BY ra.created_at DESC
    `).all() as any[];
    db.close();
    return rows;
  } catch { return []; }
}

function getCriticalBiaLinks(): CriticalBiaLink[] {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    const critProcs = db.prepare(`
      SELECT process_name, related_assets
      FROM business_processes
      WHERE priority_level = 'Critical'
        AND related_assets != '[]'
        AND related_assets IS NOT NULL
    `).all() as any[];
    db.close();

    const links: CriticalBiaLink[] = [];
    for (const p of critProcs) {
      try {
        const ids: number[] = JSON.parse(p.related_assets);
        if (ids.length > 0) links.push({ processName: p.process_name, assetIds: ids });
      } catch { /* skip */ }
    }
    return links;
  } catch { return []; }
}

const TYPE_ICONS: Record<string, string> = { Hardware: "🖥️", Software: "⚙️", Data: "🗄️", People: "👥" };
const TYPE_COLORS: Record<string, string> = {
  Hardware: "bg-blue-100 text-blue-700",
  Software: "bg-purple-100 text-purple-700",
  Data:     "bg-green-100 text-green-700",
  People:   "bg-orange-100 text-orange-700",
};

export default function AssetsPage() {
  const assets      = getAssets();
  const biaLinks    = getCriticalBiaLinks();
  const linkedIds   = new Set(biaLinks.flatMap(l => l.assetIds));
  const affectedAssets = assets.filter((a: any) => linkedIds.has(a.id));

  return (
    <div className="max-w-6xl space-y-8">
      {/* BIA Critical Warning Banner */}
      {biaLinks.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                BIA Critical Process Alert — {biaLinks.length} Critical Business Process{biaLinks.length > 1 ? "es" : ""} Linked to Assets
              </p>
              <p className="text-amber-700 text-xs mt-1">
                The following critical business processes depend on assets in this register.
                Review <strong>Availability (A)</strong> scores for linked assets and ensure they reflect the highest criticality.
              </p>
              <ul className="mt-2 space-y-1">
                {biaLinks.map(link => (
                  <li key={link.processName} className="text-xs text-amber-800">
                    • <strong>{link.processName}</strong> — linked to {link.assetIds.length} asset{link.assetIds.length > 1 ? "s" : ""}
                    {affectedAssets.filter((a: any) => link.assetIds.includes(a.id)).length > 0 && (
                      <span className="text-amber-600">
                        {" "}({affectedAssets.filter((a: any) => link.assetIds.includes(a.id)).map((a: any) => a.name).join(", ")})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <a href="/bia" className="inline-block mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline">
                → View BIA Module
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header + breadcrumb */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Risk Assessment → <span className="text-gray-700 font-medium">Step 1: Asset Registration</span></p>
        <h1 className="text-2xl font-bold text-gray-900">ลงทะเบียนสินทรัพย์</h1>
        <p className="text-gray-500 mt-1">ลงทะเบียนสินทรัพย์และประเมินค่า CIA Triad เพื่อคำนวณ Asset Value</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Form */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">เพิ่มสินทรัพย์ใหม่</h2>
          <AssetRegistrationForm />
        </div>

        {/* Asset list */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">สินทรัพย์ที่ลงทะเบียนแล้ว ({assets.length})</h2>
            <a href="/risk-assessment/assess" className="text-sm text-blue-600 font-semibold hover:underline">Step 2: Assess Risks →</a>
          </div>

          {assets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400 text-sm">ยังไม่มีสินทรัพย์ที่ลงทะเบียน — กรอกฟอร์มด้านซ้ายเพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((a: any) => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl mt-0.5">{TYPE_ICONS[a.type] ?? "📦"}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                          {a.owner && <span className="text-xs text-gray-500">👤 {a.owner}</span>}
                          <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                        </div>
                        {a.description && <p className="text-xs text-gray-500 mt-1.5">{a.description}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-blue-700">{Number(a.asset_value).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Asset Value</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
                    {[
                      { label: "C", val: a.confidentiality, color: "bg-blue-50 text-blue-700" },
                      { label: "I", val: a.integrity,       color: "bg-purple-50 text-purple-700" },
                      { label: "A", val: a.availability,    color: "bg-orange-50 text-orange-700" },
                      { label: "📋 Risks", val: a.assessment_count, color: "bg-gray-50 text-gray-700" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className={`rounded-lg py-1.5 font-semibold ${color}`}>
                        <p className="text-base font-bold">{val}</p>
                        <p className="opacity-70">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
