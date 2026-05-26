import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth/session";
import { getUserPermissions, PORTAL_MODULES } from "@/lib/portal-auth";
import Database from "better-sqlite3";
import path from "path";
import { Lock, ArrowRight } from "lucide-react";

function getStats() {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    const assets      = (db.prepare("SELECT COUNT(*) as c FROM risk_assets").get() as any).c;
    const assessments = (db.prepare("SELECT COUNT(*) as c FROM risk_assessments").get() as any).c;
    const critical    = (db.prepare("SELECT COUNT(*) as c FROM risk_assessments WHERE risk_level='Critical'").get() as any).c;
    const controls    = (db.prepare("SELECT COUNT(DISTINCT control_id) as c FROM risk_control_mappings WHERE selected=1").get() as any).c;
    db.close();
    return { assets, assessments, critical, controls };
  } catch { return { assets: 0, assessments: 0, critical: 0, controls: 0 }; }
}

const COLOR_CLASSES: Record<string, { card: string; icon: string; btn: string }> = {
  blue:   { card: "border-blue-200 hover:border-blue-400 hover:shadow-blue-100",   icon: "bg-blue-100",   btn: "bg-blue-600 hover:bg-blue-700" },
  orange: { card: "border-orange-200 hover:border-orange-400 hover:shadow-orange-100", icon: "bg-orange-100", btn: "bg-orange-500 hover:bg-orange-600" },
  red:    { card: "border-red-200 hover:border-red-400 hover:shadow-red-100",       icon: "bg-red-100",    btn: "bg-red-600 hover:bg-red-700" },
  green:  { card: "border-green-200 hover:border-green-400 hover:shadow-green-100", icon: "bg-green-100",  btn: "bg-green-600 hover:bg-green-700" },
};

export default async function PortalDashboard() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const permissions = getUserPermissions(session.id);
  const stats = getStats();

  const accessCount = PORTAL_MODULES.filter(m => permissions[m.id]?.canAccess).length;
  const editCount   = PORTAL_MODULES.filter(m => permissions[m.id]?.canEdit).length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white rounded-xl p-1.5 shrink-0">
            <Image src="/cat-logo.png" alt="CAT INFONET" width={36} height={36} />
          </div>
          <p className="text-blue-100 font-semibold text-sm">CAT INFONET — Risk Assessment Portal</p>
        </div>
        <h1 className="text-2xl font-black">สวัสดี, {session.name} 👋</h1>
        <p className="text-blue-100 mt-2 text-sm">
          คุณมีสิทธิ์เข้าถึง <strong>{accessCount}</strong> โมดูล
          {editCount > 0 && ` (แก้ไขได้ ${editCount} โมดูล)`}
        </p>
        <div className="flex gap-6 mt-5 text-sm">
          {[
            { label: "สินทรัพย์",     val: stats.assets },
            { label: "การประเมิน",    val: stats.assessments },
            { label: "Critical Risks", val: stats.critical },
            { label: "Controls ที่ใช้", val: stats.controls },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-2xl font-bold">{val}</p>
              <p className="text-blue-200 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div>
        <h2 className="font-bold text-gray-900 mb-4">โมดูลที่ใช้งานได้</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PORTAL_MODULES.map(mod => {
            const perm = permissions[mod.id];
            const hasAccess = perm?.canAccess;
            const canEdit = perm?.canEdit;
            const cc = COLOR_CLASSES[mod.color];

            return (
              <div key={mod.id} className={`bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all ${
                hasAccess ? `${cc.card} shadow-sm hover:shadow-md` : "border-gray-100 opacity-60"
              }`}>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    hasAccess ? cc.icon : "bg-gray-100"
                  }`}>
                    {hasAccess ? mod.icon : "🔒"}
                  </div>
                  {hasAccess && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      canEdit ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {canEdit ? "✏️ Edit" : "👁️ View"}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <p className={`font-bold text-sm ${hasAccess ? "text-gray-900" : "text-gray-400"}`}>
                    {mod.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.labelTh}</p>
                  <p className={`text-xs mt-2 ${hasAccess ? "text-gray-500" : "text-gray-400"}`}>{mod.desc}</p>
                </div>

                {hasAccess ? (
                  <Link href={mod.href}
                    className={`flex items-center justify-center gap-2 text-white text-sm font-semibold py-2 rounded-xl transition ${cc.btn}`}>
                    เปิด <ArrowRight size={14} />
                  </Link>
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm py-2 rounded-xl cursor-not-allowed">
                    <Lock size={14} /> ไม่มีสิทธิ์
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {accessCount === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="text-yellow-700 font-semibold">ยังไม่มีสิทธิ์เข้าถึงโมดูลใด</p>
          <p className="text-yellow-600 text-sm mt-1">กรุณาติดต่อ Admin เพื่อขอสิทธิ์การใช้งาน</p>
        </div>
      )}
    </div>
  );
}
