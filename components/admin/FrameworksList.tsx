"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Edit2, Trash2, Loader2, X, ChevronRight,
  CheckCircle2, AlertTriangle, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FrameworkRow {
  id: number;
  name: string;
  version: string;
  description: string | null;
  category: string | null;
  requirement_count: number;
  created_at: string;
}

interface Props {
  initialFrameworks: FrameworkRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Information Security",
  "Privacy",
  "Business Continuity",
  "AI Management",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Information Security": "bg-blue-100 text-blue-700",
  "Privacy":              "bg-purple-100 text-purple-700",
  "Business Continuity":  "bg-green-100 text-green-700",
  "AI Management":        "bg-amber-100 text-amber-700",
  "Other":                "bg-gray-100 text-gray-600",
};

const EMPTY_FORM = { name: "", version: "", description: "", category: "Information Security" };

// ── Form component ─────────────────────────────────────────────────────────────
function FrameworkForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState(initial);
  const setF = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Framework Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. ISO 27701"
            value={form.name}
            onChange={e => setF("name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Version *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. 2025"
            value={form.version}
            onChange={e => setF("version", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.category}
            onChange={e => setF("category", e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            rows={2}
            placeholder="Brief description of the framework"
            value={form.description}
            onChange={e => setF("description", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.version.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Save Framework
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FrameworksList({ initialFrameworks }: Props) {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState(initialFrameworks);
  const [mode,       setMode]       = useState<"idle" | "create" | { edit: FrameworkRow }>("idle");
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const handleCreate = useCallback(async (form: typeof EMPTY_FORM) => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setFrameworks(prev => [...prev, { ...data.framework, requirement_count: 0 }]);
      setMode("idle");
      showToast("Framework created successfully");
    } finally { setSaving(false); }
  }, []);

  const handleEdit = useCallback(async (id: number, form: typeof EMPTY_FORM) => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/frameworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setFrameworks(prev => prev.map(f =>
        f.id === id ? { ...f, ...form } : f
      ));
      setMode("idle");
      showToast("Framework updated");
    } finally { setSaving(false); }
  }, []);

  const handleDelete = useCallback(async (fw: FrameworkRow) => {
    if (!confirm(`Delete "${fw.name} v${fw.version}"?\n\nThis will also delete all ${fw.requirement_count} requirements and assessment data. This cannot be undone.`)) return;
    setDeleting(fw.id);
    try {
      const res = await fetch(`/api/admin/frameworks/${fw.id}`, { method: "DELETE" });
      if (!res.ok) { alert("Delete failed"); return; }
      setFrameworks(prev => prev.filter(f => f.id !== fw.id));
      showToast(`"${fw.name}" deleted`);
    } finally { setDeleting(null); }
  }, []);

  const editFw = typeof mode === "object" && "edit" in mode ? mode.edit : null;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={15} />
          {toast}
        </div>
      )}

      {/* Create form */}
      {mode === "create" && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Add New Framework
            </h2>
            <button onClick={() => { setMode("idle"); setError(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <FrameworkForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => { setMode("idle"); setError(null); }}
            saving={saving}
            error={error}
          />
        </div>
      )}

      {/* Edit form */}
      {editFw && (
        <div className="bg-white rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Edit2 size={16} className="text-amber-600" /> Edit Framework
            </h2>
            <button onClick={() => { setMode("idle"); setError(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <FrameworkForm
            initial={{
              name:        editFw.name,
              version:     editFw.version,
              description: editFw.description ?? "",
              category:    editFw.category ?? "Information Security",
            }}
            onSave={form => handleEdit(editFw.id, form)}
            onCancel={() => { setMode("idle"); setError(null); }}
            saving={saving}
            error={error}
          />
        </div>
      )}

      {/* Header + Add button */}
      {mode === "idle" && (
        <button
          onClick={() => { setMode("create"); setError(null); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Framework
        </button>
      )}

      {/* Framework table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            All Frameworks
            <span className="ml-2 text-sm font-normal text-gray-500">({frameworks.length})</span>
          </h2>
        </div>

        {frameworks.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No frameworks yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first framework to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Framework</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Requirements</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {frameworks.map(fw => (
                <tr key={fw.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{fw.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">v{fw.version}</p>
                    {fw.description && (
                      <p className="text-xs text-gray-500 mt-1 max-w-sm truncate">{fw.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium",
                      CATEGORY_COLORS[fw.category ?? "Other"] ?? "bg-gray-100 text-gray-600"
                    )}>
                      {fw.category ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                      {fw.requirement_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {fw.created_at?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setMode({ edit: fw }); setError(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => router.push(`/admin/frameworks/${fw.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <BookOpen size={12} />
                        Requirements
                        <ChevronRight size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(fw)}
                        disabled={deleting === fw.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === fw.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
