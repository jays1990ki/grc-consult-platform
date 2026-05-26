"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, FolderOpen, Loader2, CheckCircle2, AlertTriangle,
  Clock, BarChart2, X, Calendar, User, Building2, ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuditProjectRow {
  id: number;
  project_name: string;
  framework: string | null;
  auditor_name: string | null;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  total_evidence: number;
  passed_evidence: number;
  failed_evidence: number;
  overdue_evidence: number;
  created_at: string;
}

interface AuditStats {
  totalProjects: number;
  activeProjects: number;
  completionPct: number;
  overdueEvidence: number;
  recentFiles: {
    project_name: string;
    evidence_name: string;
    original_filename: string;
    uploaded_by: string;
    created_at: string;
    version_number: number;
  }[];
}

interface Props {
  initialProjects: AuditProjectRow[];
  stats: AuditStats;
  orgId?: number;
  frameworkOptions?: string[];
}

// Fallback list used when dynamic frameworks haven't loaded
const FRAMEWORK_FALLBACK = [
  "ISO 27001:2022", "ISO 27001:2013", "PDPA Thailand",
  "PCI-DSS v4.0", "SOC 2 Type II", "NIST CSF 2.0",
  "ISO 9001:2015", "ISO 22301:2019", "Other",
];

const STATUS_COLORS: Record<string, string> = {
  "Planning":     "bg-gray-100 text-gray-700",
  "Active":       "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  "Completed":    "bg-green-100 text-green-700",
};

function completionPct(p: AuditProjectRow): number {
  if (!p.total_evidence) return 0;
  return Math.round(((p.passed_evidence + p.failed_evidence) / p.total_evidence) * 100);
}

function passPct(p: AuditProjectRow): number {
  if (!p.total_evidence) return 0;
  return Math.round((p.passed_evidence / p.total_evidence) * 100);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return d.slice(0, 10);
}

function timeAgo(dt: string): string {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuditProjectsList({ initialProjects, stats, orgId = 1, frameworkOptions }: Props) {
  const FRAMEWORKS = frameworkOptions?.length ? [...frameworkOptions, "Other"] : FRAMEWORK_FALLBACK;
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({
    project_name: "",
    framework:    "",
    auditor_name: "",
    client_name:  "",
    start_date:   "",
    end_date:     "",
    status:       "Planning",
  });

  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = useCallback(async () => {
    if (!form.project_name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/audit/projects?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      setCreating(false);
      setForm({ project_name: "", framework: "", auditor_name: "", client_name: "", start_date: "", end_date: "", status: "Planning" });
    } finally {
      setSaving(false);
    }
  }, [form, orgId, router]);

  const handleDelete = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this audit project and all its evidence? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/audit/projects/${id}?orgId=${orgId}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }, [orgId]);

  return (
    <div className="space-y-8">

      {/* ── Dashboard Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "📁", label: "Total Projects",      val: stats.totalProjects,    color: "bg-blue-50 text-blue-700" },
          { icon: "⚡", label: "Active Projects",     val: stats.activeProjects,   color: "bg-green-50 text-green-700" },
          { icon: "📊", label: "Completion (Active)", val: `${stats.completionPct}%`, color: "bg-purple-50 text-purple-700" },
          { icon: "⚠️", label: "Overdue Evidence",    val: stats.overdueEvidence,  color: "bg-red-50 text-red-700" },
        ].map(({ icon, label, val, color }) => (
          <div key={label} className={`rounded-xl p-5 ${color}`}>
            <p className="text-3xl font-bold">{val}</p>
            <p className="text-sm mt-1 opacity-80">{icon} {label}</p>
          </div>
        ))}
      </div>

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {creating ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">New Audit Project</h2>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. Annual ISO 27001 Audit 2025"
                value={form.project_name}
                onChange={e => setF("project_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Framework</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.framework}
                onChange={e => setF("framework", e.target.value)}
              >
                <option value="">— Select framework —</option>
                {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Auditor Name</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Lead auditor"
                value={form.auditor_name}
                onChange={e => setF("auditor_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client / Auditee</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Organization being audited"
                value={form.client_name}
                onChange={e => setF("client_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.start_date}
                onChange={e => setF("start_date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.end_date}
                onChange={e => setF("end_date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.status}
                onChange={e => setF("status", e.target.value)}
              >
                {["Planning","Active","Under Review","Completed"].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.project_name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Audit Project
        </button>
      )}

      {/* ── Projects list ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">All Projects ({projects.length})</h2>

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
            <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No audit projects yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first audit project to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(p => {
              const cPct    = completionPct(p);
              const pPct    = passPct(p);
              const pending = p.total_evidence - p.passed_evidence - p.failed_evidence;
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/audit/${p.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {p.project_name}
                        </h3>
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600")}>
                          {p.status}
                        </span>
                        {p.framework && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                            {p.framework}
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        {p.auditor_name && (
                          <span className="flex items-center gap-1"><User size={11} />{p.auditor_name}</span>
                        )}
                        {p.client_name && (
                          <span className="flex items-center gap-1"><Building2 size={11} />{p.client_name}</span>
                        )}
                        {(p.start_date || p.end_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />{fmtDate(p.start_date)} → {fmtDate(p.end_date)}
                          </span>
                        )}
                      </div>

                      {/* Progress + counts */}
                      {p.total_evidence > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Evidence: {p.passed_evidence + p.failed_evidence} of {p.total_evidence} reviewed ({cPct}%)</span>
                            <div className="flex items-center gap-3">
                              {p.passed_evidence > 0  && <span className="text-green-600 font-medium">✓ {p.passed_evidence} Pass</span>}
                              {p.failed_evidence > 0  && <span className="text-red-600 font-medium">✗ {p.failed_evidence} Fail</span>}
                              {pending > 0             && <span className="text-gray-400">{pending} Pending</span>}
                              {p.overdue_evidence > 0  && <span className="text-amber-600 font-medium">⚠ {p.overdue_evidence} Overdue</span>}
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full flex">
                              <div className="h-full bg-green-500 transition-all" style={{ width: `${pPct}%` }} />
                              <div className="h-full bg-red-400 transition-all"   style={{ width: `${p.total_evidence > 0 ? Math.round((p.failed_evidence / p.total_evidence) * 100) : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {p.total_evidence === 0 && (
                        <p className="mt-2 text-xs text-gray-400">No evidence requests yet</p>
                      )}
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => handleDelete(p.id, e)}
                        disabled={deleting === p.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      {stats.recentFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-600" />
            Recent Upload Activity
          </h2>
          <div className="space-y-3">
            {stats.recentFiles.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{f.original_filename}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="text-gray-700">{f.evidence_name}</span> · {f.project_name} · v{f.version_number}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{f.uploaded_by}</p>
                  <p className="text-xs text-gray-400">{timeAgo(f.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
