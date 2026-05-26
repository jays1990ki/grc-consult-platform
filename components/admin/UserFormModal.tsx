"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { PORTAL_MODULES } from "@/lib/portal-modules";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
}

interface PermMap {
  [moduleId: string]: { canAccess: boolean; canEdit: boolean };
}

interface Props {
  user?: UserRow | null;         // null → create mode
  onClose: () => void;
  onSaved: () => void;
}

const ROLES = ["admin", "manager", "viewer"] as const;

const defaultPerms = (): PermMap =>
  Object.fromEntries(PORTAL_MODULES.map(m => [m.id, { canAccess: false, canEdit: false }]));

export default function UserFormModal({ user, onClose, onSaved }: Props) {
  const isEdit = !!user;

  const [name,     setName]     = useState(user?.name     ?? "");
  const [email,    setEmail]    = useState(user?.email    ?? "");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState<string>(user?.role ?? "viewer");
  const [status,   setStatus]   = useState(user?.status ?? "active");
  const [perms,    setPerms]    = useState<PermMap>(defaultPerms());
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // Load existing permissions for edit mode
  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/portal/permissions?userId=${user.id}`)
      .then(r => r.json())
      .then((data: Record<string, { canAccess: boolean; canEdit: boolean }>) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) return;
        const map = defaultPerms();
        for (const [mod, p] of Object.entries(data)) {
          map[mod] = { canAccess: !!p.canAccess, canEdit: !!p.canEdit };
        }
        setPerms(map);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // When role changes in create mode, set sensible permission defaults
  function applyRoleDefaults(newRole: string) {
    if (isEdit) return;
    const canEdit = newRole === "admin" || newRole === "manager";
    const map = defaultPerms();
    PORTAL_MODULES.forEach(m => {
      map[m.id] = { canAccess: true, canEdit };
    });
    setPerms(map);
  }

  function toggleAccess(mod: string) {
    setPerms(prev => {
      const cur = prev[mod];
      const nextAccess = !cur.canAccess;
      return { ...prev, [mod]: { canAccess: nextAccess, canEdit: nextAccess ? cur.canEdit : false } };
    });
  }

  function toggleEdit(mod: string) {
    setPerms(prev => {
      const cur = prev[mod];
      if (!cur.canAccess) return prev; // can't edit without access
      return { ...prev, [mod]: { ...cur, canEdit: !cur.canEdit } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = { name, email, role, permissions: perms };
      if (isEdit) {
        body.id = user.id;
        body.status = status;
        if (password) body.password = password;
      } else {
        body.password = password;
      }

      const res = await fetch("/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">
            {isEdit ? "Edit User" : "Create New User"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <form id="user-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? "New Password (leave blank to keep)" : "Password *"}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                required={!isEdit}
                minLength={6}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder={isEdit ? "••••••••" : "Min 6 characters"}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={role}
                onChange={e => { setRole(e.target.value); applyRoleDefaults(e.target.value); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          {/* Portal Permissions */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Portal Permissions</p>
            <div className="space-y-2 rounded-xl border border-gray-100 p-3 bg-gray-50">
              {PORTAL_MODULES.map(mod => {
                const p = perms[mod.id] ?? { canAccess: false, canEdit: false };
                return (
                  <div key={mod.id} className="flex items-center justify-between py-1.5 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{mod.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{mod.label}</p>
                        <p className="text-xs text-gray-500 truncate">{mod.labelTh}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      {/* Access toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <div
                          onClick={() => toggleAccess(mod.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${p.canAccess ? "bg-blue-500" : "bg-gray-300"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.canAccess ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-xs text-gray-600">View</span>
                      </label>
                      {/* Edit toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <div
                          onClick={() => toggleEdit(mod.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            p.canEdit ? "bg-green-500" : p.canAccess ? "bg-gray-300" : "bg-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.canEdit ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-xs text-gray-600">Edit</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            form="user-form"
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
