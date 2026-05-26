"use client";

import { useState, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Loader2, X, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RequirementRow {
  id: number;
  framework_id: number;
  requirement_id: string;
  requirement_name: string;
  domain: string;
  description: string | null;
  guidance: string | null;
  sort_order: number;
}

export interface FrameworkInfo {
  id: number;
  name: string;
  version: string;
  category: string | null;
}

interface Props {
  framework: FrameworkInfo;
  initialRequirements: RequirementRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  "Organizational":      "bg-blue-50 text-blue-700",
  "People":              "bg-purple-50 text-purple-700",
  "Physical":            "bg-amber-50 text-amber-700",
  "Technological":       "bg-green-50 text-green-700",
  "PIMS Controls":       "bg-blue-50 text-blue-700",
  "Privacy by Design":   "bg-purple-50 text-purple-700",
  "Data Subject Rights": "bg-pink-50 text-pink-700",
  "Third Party":         "bg-orange-50 text-orange-700",
  "Breach Response":     "bg-red-50 text-red-700",
  "AI Governance":       "bg-amber-50 text-amber-700",
  "Risk Assessment":     "bg-orange-50 text-orange-700",
  "Data Quality":        "bg-blue-50 text-blue-700",
  "Human Oversight":     "bg-purple-50 text-purple-700",
  "Transparency":        "bg-green-50 text-green-700",
  "Context":             "bg-gray-100 text-gray-700",
  "Leadership":          "bg-blue-50 text-blue-700",
  "Planning":            "bg-purple-50 text-purple-700",
  "Operations":          "bg-green-50 text-green-700",
  "Performance":         "bg-amber-50 text-amber-700",
  "Improvement":         "bg-teal-50 text-teal-700",
  "Core Obligations":    "bg-blue-50 text-blue-700",
  "Sensitive Data":      "bg-red-50 text-red-700",
  "Data Lifecycle":      "bg-purple-50 text-purple-700",
  "International Transfer":"bg-orange-50 text-orange-700",
  "Accountability":      "bg-green-50 text-green-700",
  "Incident Response":   "bg-red-50 text-red-700",
};

const EMPTY_FORM = {
  requirement_id:   "",
  requirement_name: "",
  domain:           "",
  description:      "",
  guidance:         "",
  sort_order:       "",
};

type FormData = typeof EMPTY_FORM;

// ── Inline Form ────────────────────────────────────────────────────────────────
function RequirementForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
  existingDomains,
}: {
  initial: FormData;
  onSave: (d: FormData) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  existingDomains: string[];
}) {
  const [form, setForm]     = useState(initial);
  const [showAdv, setShowAdv] = useState(false);
  const setF = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Requirement ID *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. A.5.1 or Clause 6.1"
            value={form.requirement_id}
            onChange={e => setF("requirement_id", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Domain *</label>
          <div className="relative">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Organizational Controls"
              value={form.domain}
              onChange={e => setF("domain", e.target.value)}
              list={`domains-${initial.requirement_id || "new"}`}
            />
            <datalist id={`domains-${initial.requirement_id || "new"}`}>
              {existingDomains.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Requirement Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Full requirement name"
            value={form.requirement_name}
            onChange={e => setF("requirement_name", e.target.value)}
          />
        </div>
      </div>

      {/* Advanced fields toggle */}
      <button
        type="button"
        onClick={() => setShowAdv(a => !a)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        {showAdv ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showAdv ? "Hide" : "Show"} description & guidance
      </button>

      {showAdv && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="What does this requirement cover?"
              value={form.description}
              onChange={e => setF("description", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Guidance / Audit Tips</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="How to audit / evidence to collect"
              value={form.guidance}
              onChange={e => setF("guidance", e.target.value)}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="auto"
              value={form.sort_order}
              onChange={e => setF("sort_order", e.target.value)}
            />
          </div>
        </div>
      )}

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
          disabled={saving || !form.requirement_id.trim() || !form.requirement_name.trim() || !form.domain.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Save Requirement
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RequirementsList({ framework, initialRequirements }: Props) {
  const [requirements, setRequirements] = useState(initialRequirements);
  const [mode,         setMode]         = useState<"idle" | "create" | { edit: RequirementRow }>("idle");
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<number | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("All");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const allDomains = Array.from(new Set(requirements.map(r => r.domain))).sort();
  const filtered   = domainFilter === "All" ? requirements : requirements.filter(r => r.domain === domainFilter);
  const editReq    = typeof mode === "object" && "edit" in mode ? mode.edit : null;

  const handleCreate = useCallback(async (form: FormData) => {
    setError(null);
    setSaving(true);
    try {
      const body = {
        requirement_id:   form.requirement_id.trim(),
        requirement_name: form.requirement_name.trim(),
        domain:           form.domain.trim(),
        description:      form.description || undefined,
        guidance:         form.guidance    || undefined,
        sort_order:       form.sort_order  ? Number(form.sort_order) : undefined,
      };
      const res  = await fetch(`/api/admin/frameworks/${framework.id}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }

      const newReq: RequirementRow = {
        id: data.id,
        framework_id:     framework.id,
        requirement_id:   form.requirement_id.trim(),
        requirement_name: form.requirement_name.trim(),
        domain:           form.domain.trim(),
        description:      form.description || null,
        guidance:         form.guidance    || null,
        sort_order:       form.sort_order  ? Number(form.sort_order) : 9999,
      };
      setRequirements(prev => [...prev, newReq]);
      setMode("idle");
      showToast("Requirement added");
    } finally { setSaving(false); }
  }, [framework.id]);

  const handleEdit = useCallback(async (id: number, form: FormData) => {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        requirement_id:   form.requirement_id.trim(),
        requirement_name: form.requirement_name.trim(),
        domain:           form.domain.trim(),
        description:      form.description || null,
        guidance:         form.guidance    || null,
      };
      if (form.sort_order) body.sort_order = Number(form.sort_order);

      const res  = await fetch(`/api/admin/frameworks/${framework.id}/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }

      setRequirements(prev => prev.map(r =>
        r.id === id
          ? { ...r, ...body, sort_order: body.sort_order as number ?? r.sort_order }
          : r
      ));
      setMode("idle");
      showToast("Requirement updated");
    } finally { setSaving(false); }
  }, [framework.id]);

  const handleDelete = useCallback(async (r: RequirementRow) => {
    if (!confirm(`Delete requirement "${r.requirement_id} — ${r.requirement_name}"?\n\nThis will also remove any assessment entries for this requirement.`)) return;
    setDeleting(r.id);
    try {
      const res = await fetch(`/api/admin/frameworks/${framework.id}/requirements/${r.id}`, { method: "DELETE" });
      if (!res.ok) { alert("Delete failed"); return; }
      setRequirements(prev => prev.filter(req => req.id !== r.id));
      showToast("Requirement deleted");
    } finally { setDeleting(null); }
  }, [framework.id]);

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Add New Requirement
            </h2>
            <button onClick={() => { setMode("idle"); setError(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <RequirementForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => { setMode("idle"); setError(null); }}
            saving={saving}
            error={error}
            existingDomains={allDomains}
          />
        </div>
      )}

      {/* Add button + domain filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {mode === "idle" && (
          <button
            onClick={() => { setMode("create"); setError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
          >
            <Plus size={15} />
            Add Requirement
          </button>
        )}

        {/* Domain filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {["All", ...allDomains].map(d => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                domainFilter === d
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {d}
              {d !== "All" && (
                <span className="ml-1 opacity-70">
                  ({requirements.filter(r => r.domain === d).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Requirements
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filtered.length}{domainFilter !== "All" ? ` of ${requirements.length}` : ""})
            </span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Hash size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No requirements in this domain</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(r => (
              <div key={r.id}>
                {/* Edit inline form */}
                {editReq?.id === r.id && (
                  <div className="p-5 bg-amber-50 border-b border-amber-200">
                    <RequirementForm
                      initial={{
                        requirement_id:   r.requirement_id,
                        requirement_name: r.requirement_name,
                        domain:           r.domain,
                        description:      r.description ?? "",
                        guidance:         r.guidance    ?? "",
                        sort_order:       String(r.sort_order),
                      }}
                      onSave={form => handleEdit(r.id, form)}
                      onCancel={() => { setMode("idle"); setError(null); }}
                      saving={saving}
                      error={error}
                      existingDomains={allDomains}
                    />
                  </div>
                )}

                {/* Normal row */}
                {(!editReq || editReq.id !== r.id) && (
                  <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 group transition-colors">
                    {/* Req ID */}
                    <div className="shrink-0 w-24">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        {r.requirement_id}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.requirement_name}</p>
                      {r.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                      {r.guidance && (
                        <p className="text-xs text-blue-600 mt-1 italic line-clamp-1">
                          💡 {r.guidance}
                        </p>
                      )}
                    </div>

                    {/* Domain badge */}
                    <div className="shrink-0">
                      <span className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium",
                        DOMAIN_COLORS[r.domain] ?? "bg-gray-100 text-gray-600"
                      )}>
                        {r.domain}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setMode({ edit: r }); setError(null); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deleting === r.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
