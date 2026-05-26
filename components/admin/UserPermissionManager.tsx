"use client";

import { useState } from "react";
import { Settings, ChevronDown, Shield, Database, Activity, BarChart3, Lock, Unlock } from "lucide-react";

const MODULES = [
  { id: "assets",    label: "Asset Registration",   labelTh: "ลงทะเบียนสินทรัพย์",  icon: Database },
  { id: "assess",    label: "Risk Assessment",       labelTh: "ประเมินความเสี่ยง",      icon: Activity },
  { id: "controls",  label: "Control Mapping",       labelTh: "จับคู่มาตรการควบคุม",   icon: Shield },
  { id: "executive", label: "Executive Dashboard",   labelTh: "แดชบอร์ดสรุปผล",        icon: BarChart3 },
];

interface UserPermissionManagerProps {
  userId: number;
  userName: string;
}

type PermMap = Record<string, { canAccess: boolean; canEdit: boolean }>;

export default function UserPermissionManager({ userId, userName }: UserPermissionManagerProps) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState<PermMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/permissions?userId=${userId}`);
      const data: PermMap = await res.json();
      setPerms(data);
    } finally { setLoading(false); }
  }

  function toggle(mod: string, field: "canAccess" | "canEdit") {
    setPerms(prev => {
      const current = prev[mod] ?? { canAccess: false, canEdit: false };
      const next = { ...current, [field]: !current[field] };
      // if disabling access, also disable edit
      if (field === "canAccess" && !next.canAccess) next.canEdit = false;
      // if enabling edit, also enable access
      if (field === "canEdit" && next.canEdit) next.canAccess = true;
      return { ...prev, [mod]: next };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/portal/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions: perms }),
      });
      setSaved(true);
    } finally { setSaving(false); }
  }

  function handleOpen() {
    setOpen(o => !o);
    if (!open) load();
  }

  const accessCount = Object.values(perms).filter(p => p.canAccess).length;

  return (
    <div>
      <button onClick={handleOpen}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition border ${
          open ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
        }`}>
        <Settings size={12} />
        Permissions
        {accessCount > 0 && !open && (
          <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 text-xs">{accessCount}</span>
        )}
        <ChevronDown size={12} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3 z-10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">Portal Permissions — {userName}</p>
            {loading && <span className="text-xs text-gray-400">Loading…</span>}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-100">
            <div className="col-span-6">Module</div>
            <div className="col-span-3 text-center">View</div>
            <div className="col-span-3 text-center">Edit</div>
          </div>

          {MODULES.map(({ id, label, labelTh, icon: Icon }) => {
            const perm = perms[id] ?? { canAccess: false, canEdit: false };
            return (
              <div key={id} className={`grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg transition ${
                perm.canAccess ? "bg-blue-50" : "bg-gray-50"
              }`}>
                <div className="col-span-6 flex items-center gap-2">
                  <Icon size={14} className={perm.canAccess ? "text-blue-600" : "text-gray-400"} />
                  <div>
                    <p className={`text-xs font-semibold ${perm.canAccess ? "text-gray-900" : "text-gray-400"}`}>{label}</p>
                    <p className="text-xs text-gray-400">{labelTh}</p>
                  </div>
                </div>
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggle(id, "canAccess")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${perm.canAccess ? "bg-blue-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${perm.canAccess ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggle(id, "canEdit")}
                    disabled={!perm.canAccess}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      perm.canEdit ? "bg-green-500" : perm.canAccess ? "bg-gray-300" : "bg-gray-200 opacity-50 cursor-not-allowed"
                    }`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${perm.canEdit ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="text-blue-600 font-semibold">View</span> = เข้าดูได้ &nbsp;|&nbsp;
              <span className="text-green-600 font-semibold">Edit</span> = สร้าง/แก้ไขได้
            </p>
            <button onClick={save} disabled={saving}
              className="text-xs font-semibold px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition">
              {saving ? "Saving…" : saved ? "✅ Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
