"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Loader2, X, ChevronRight, Calendar, User,
  FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportPDFButton from "@/components/shared/ExportPDFButton";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuditProject {
  id: number;
  project_name: string;
  framework: string | null;
  auditor_name: string | null;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export interface EvidenceRow {
  id: number;
  audit_project_id: number;
  requirement_id: string | null;
  evidence_name: string;
  evidence_description: string | null;
  assigned_owner: string | null;
  due_date: string | null;
  status: string;
  file_count: number;
  latest_version: number | null;
}

interface Props {
  project: AuditProject;
  initialEvidence: EvidenceRow[];
  orgId?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_TABS = ["All", "Pending", "Submitted", "Under Review", "Pass", "Fail", "Need Revision"] as const;

const STATUS_BADGE: Record<string, string> = {
  "Not Submitted": "bg-gray-100 text-gray-600",
  "Submitted":     "bg-blue-100 text-blue-700",
  "Under Review":  "bg-amber-100 text-amber-700",
  "Pass":          "bg-green-100 text-green-700",
  "Fail":          "bg-red-100 text-red-700",
  "Need Revision": "bg-orange-100 text-orange-700",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  "Pass":          <CheckCircle2 size={12} className="text-green-500" />,
  "Fail":          <AlertTriangle size={12} className="text-red-500" />,
  "Need Revision": <RefreshCw size={12} className="text-orange-500" />,
  "Submitted":     <FileText size={12} className="text-blue-500" />,
  "Under Review":  <Clock size={12} className="text-amber-500" />,
  "Not Submitted": <Clock size={12} className="text-gray-400" />,
};

function isOverdue(ev: EvidenceRow): boolean {
  if (!ev.due_date || ev.status === "Pass" || ev.status === "Fail") return false;
  return ev.due_date < new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return d.slice(0, 10);
}

function filterEvidence(rows: EvidenceRow[], tab: string): EvidenceRow[] {
  if (tab === "All") return rows;
  if (tab === "Pending") return rows.filter(r => !["Pass","Fail","Submitted","Under Review"].includes(r.status));
  return rows.filter(r => r.status === tab);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuditProjectDetail({ project, initialEvidence, orgId = 1 }: Props) {
  const router   = useRouter();
  const [evidence, setEvidence] = useState(initialEvidence);
  const [tab,      setTab]      = useState<string>("All");
  const [creating, setCreating] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({
    evidence_name:        "",
    evidence_description: "",
    requirement_id:       "",
    assigned_owner:       "",
    due_date:             "",
  });
  const setF = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Summary stats
  const total     = evidence.length;
  const passed    = evidence.filter(e => e.status === "Pass").length;
  const failed    = evidence.filter(e => e.status === "Fail").length;
  const completed = passed + failed;
  const overdue   = evidence.filter(isOverdue).length;
  const cPct      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pPct      = total > 0 ? Math.round((passed / total) * 100) : 0;

  const filtered = filterEvidence(evidence, tab);

  const handleCreate = useCallback(async () => {
    if (!form.evidence_name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/audit/projects/${project.id}/evidence?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      setCreating(false);
      setForm({ evidence_name: "", evidence_description: "", requirement_id: "", assigned_owner: "", due_date: "" });
    } finally { setSaving(false); }
  }, [form, project.id, orgId, router]);

  const handleDelete = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this evidence request?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/audit/projects/${project.id}/evidence/${id}?orgId=${orgId}`, { method: "DELETE" });
      setEvidence(prev => prev.filter(ev => ev.id !== id));
    } finally { setDeleting(null); }
  }, [project.id, orgId]);

  return (
    <div className="space-y-6">

      {/* ── Project header ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-gray-900">{project.project_name}</h1>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                {project.status}
              </span>
              {project.framework && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                  {project.framework}
                </span>
              )}
            </div>
            <div className="flex items-center gap-5 text-sm text-gray-500 flex-wrap">
              {project.auditor_name && <span className="flex items-center gap-1"><User size={13} />Auditor: {project.auditor_name}</span>}
              {project.client_name  && <span>Client: <strong className="text-gray-700">{project.client_name}</strong></span>}
              {(project.start_date || project.end_date) && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />{fmtDate(project.start_date)} – {fmtDate(project.end_date)}
                </span>
              )}
            </div>
          </div>
          <ExportPDFButton
            href={`/api/pdf/audit/${project.id}?orgId=${orgId}`}
            label="Export PDF"
            filename={`Audit-${project.id}.pdf`}
          />
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Evidence Completion</span>
              <span>{completed} / {total} reviewed &nbsp;·&nbsp; <strong className="text-blue-700">{cPct}%</strong></span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="h-full flex">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${pPct}%` }} />
                <div className="h-full bg-red-400 transition-all" style={{ width: `${total > 0 ? Math.round((failed / total) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="text-green-600 font-medium">✓ {passed} Pass</span>
              <span className="text-red-500 font-medium">✗ {failed} Fail</span>
              <span>{total - completed} Pending</span>
              {overdue > 0 && <span className="text-amber-600 font-medium">⚠ {overdue} Overdue</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Add evidence form ─────────────────────────────────────────────── */}
      {creating ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Add Evidence Request</h2>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Evidence Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Access Control Policy Document"
                value={form.evidence_name}
                onChange={e => setF("evidence_name", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={2}
                placeholder="What evidence is required?"
                value={form.evidence_description}
                onChange={e => setF("evidence_description", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Requirement ID (optional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. A.9.1.1 or GAP req ID"
                value={form.requirement_id}
                onChange={e => setF("requirement_id", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Owner</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Person responsible"
                value={form.assigned_owner}
                onChange={e => setF("assigned_owner", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.due_date}
                onChange={e => setF("due_date", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.evidence_name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Evidence
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-xl hover:border-blue-400 hover:text-blue-700 transition-colors"
        >
          <Plus size={15} />
          Add Evidence Request
        </button>
      )}

      {/* ── Evidence checklist ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-4 border-b border-gray-200 overflow-x-auto">
          {STATUS_TABS.map(t => {
            const count = t === "All" ? evidence.length
              : t === "Pending" ? evidence.filter(r => !["Pass","Fail","Submitted","Under Review"].includes(r.status)).length
              : evidence.filter(r => r.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {t}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  tab === t ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Evidence rows */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No evidence requests in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(ev => {
              const overdueMark = isOverdue(ev);
              return (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/audit/${project.id}/evidence/${ev.id}`)}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer group transition-colors",
                    ev.status === "Fail" && "bg-red-50/40 hover:bg-red-50",
                    ev.status === "Pass" && "bg-green-50/30",
                  )}
                >
                  {/* Status icon */}
                  <div className="shrink-0">{STATUS_ICON[ev.status] ?? <Clock size={12} className="text-gray-400" />}</div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{ev.evidence_name}</p>
                      {ev.requirement_id && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-mono">
                          {ev.requirement_id}
                        </span>
                      )}
                      {overdueMark && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                          ⚠ Overdue
                        </span>
                      )}
                    </div>
                    {ev.evidence_description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.evidence_description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {ev.assigned_owner && <span className="flex items-center gap-1"><User size={10} />{ev.assigned_owner}</span>}
                      {ev.due_date && (
                        <span className={cn("flex items-center gap-1", overdueMark && "text-red-500 font-medium")}>
                          <Calendar size={10} />Due {fmtDate(ev.due_date)}
                        </span>
                      )}
                      {(ev.file_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText size={10} />{ev.file_count} file{ev.file_count > 1 ? "s" : ""} (v{ev.latest_version})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", STATUS_BADGE[ev.status] ?? "bg-gray-100 text-gray-600")}>
                      {ev.status}
                    </span>
                    <button
                      onClick={e => handleDelete(ev.id, e)}
                      disabled={deleting === ev.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {deleting === ev.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                    <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
