"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertTriangle,
  BarChart2, ClipboardList, Activity, ChevronDown, ChevronUp,
  Building2, User, Cpu, Link2, Clock, Info,
} from "lucide-react";
import {
  calcMaxTimeImpact, calcRTO, calcRPO, calcPriority,
  fmtHours, impactBgClass, PRIORITY_COLORS, type PriorityLevel,
  BIA_IMPACT_LABELS,
} from "@/lib/bia-utils";
import ExportPDFButton from "@/components/shared/ExportPDFButton";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AssetOption { id: number; name: string; type: string }

export interface ProcessRow {
  id: number;
  process_name: string;
  process_owner: string | null;
  department: string | null;
  related_it_system: string | null;
  related_assets: string;   // JSON array of asset IDs
  priority_level: string;
  mtpd: number | null;
  rto: number | null;
  rpo: number | null;
  status: string;
  has_impact: number;
  impact_1h?: number; impact_4h?: number; impact_24h?: number; impact_7d?: number;
  financial_impact?: number; legal_impact?: number; operational_impact?: number;
  reputation_impact?: number; customer_impact?: number;
  financial_loss_per_hour?: number;
}

const DEFAULT_IMPACT = {
  impact_1h: 1, impact_4h: 1, impact_24h: 1, impact_7d: 1,
  financial_impact: 1, legal_impact: 1, operational_impact: 1,
  reputation_impact: 1, customer_impact: 1,
  financial_loss_per_hour: 0,
};

const DEPARTMENTS = [
  "IT / Technology", "Finance", "HR", "Operations",
  "Sales / Marketing", "Customer Service", "Legal / Compliance",
  "Management", "Other",
];

const TIME_ROWS: { key: keyof typeof DEFAULT_IMPACT; label: string }[] = [
  { key: "impact_1h",   label: "1 Hour"  },
  { key: "impact_4h",   label: "4 Hours" },
  { key: "impact_24h",  label: "24 Hours"},
  { key: "impact_7d",   label: "7 Days"  },
];

const TYPE_ROWS: { key: keyof typeof DEFAULT_IMPACT; label: string; icon: string }[] = [
  { key: "financial_impact",   label: "Financial",   icon: "💰" },
  { key: "legal_impact",       label: "Legal",       icon: "⚖️" },
  { key: "operational_impact", label: "Operational", icon: "⚙️" },
  { key: "reputation_impact",  label: "Reputation",  icon: "🏆" },
  { key: "customer_impact",    label: "Customer",    icon: "👥" },
];

// ── Score selector component ──────────────────────────────────────────────────
function ScoreSelector({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`
            w-7 h-7 rounded text-xs font-bold transition-all border
            ${n === value
              ? impactBgClass(n) + " border-transparent scale-110 shadow"
              : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
            }
          `}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ level }: { level: string }) {
  const c = PRIORITY_COLORS[level as PriorityLevel] ?? PRIORITY_COLORS.Low;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${c.badge}`}>
      {level}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BiaMain({
  initialProcesses,
  riskAssets,
  orgId = 1,
}: {
  initialProcesses: ProcessRow[];
  riskAssets: AssetOption[];
  orgId?: number;
}) {
  type Tab = "register" | "assess" | "dashboard";
  const [tab,       setTab]      = useState<Tab>("register");
  const [processes, setProcs]    = useState<ProcessRow[]>(initialProcesses);
  const [loading,   setLoading]  = useState(false);
  const [toast,     setToast]    = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Process form state ────────────────────────────────────────────────────
  const [showForm, setShowForm]  = useState(false);
  const [editId,   setEditId]    = useState<number | null>(null);
  const emptyForm = {
    process_name: "", process_owner: "", department: "",
    related_it_system: "", priority_level: "Medium",
    mtpd: "", rto: "", rpo: "", status: "Active",
    related_assets: [] as number[],
  };
  const [form, setForm] = useState(emptyForm);

  // ── Impact assessment state ───────────────────────────────────────────────
  const [selProcId,  setSelProcId]  = useState<number | "">("");
  const [impactForm, setImpactForm] = useState({ ...DEFAULT_IMPACT });
  const [savingImpact, setSavingImpact] = useState(false);

  // ── Dashboard stats ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<{
    total: number; critical: number; high: number; avgRto: number | null;
    totalLossPerDay: number; linkedAssets: number;
  } | null>(null);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const refreshProcesses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/bia/processes?orgId=${orgId}`);
      if (r.ok) setProcs(await r.json());
    } finally { setLoading(false); }
  }, [orgId]);

  const refreshStats = useCallback(async () => {
    const r = await fetch(`/api/bia/stats?orgId=${orgId}`);
    if (r.ok) setStats(await r.json());
  }, [orgId]);

  useEffect(() => {
    if (tab === "dashboard") refreshStats();
  }, [tab, refreshStats]);

  // ── Process CRUD ──────────────────────────────────────────────────────────
  function startEdit(p: ProcessRow) {
    let assetIds: number[] = [];
    try { assetIds = JSON.parse(p.related_assets); } catch { /* */ }
    setForm({
      process_name: p.process_name, process_owner: p.process_owner ?? "",
      department: p.department ?? "", related_it_system: p.related_it_system ?? "",
      priority_level: p.priority_level, mtpd: p.mtpd != null ? String(p.mtpd) : "",
      rto: p.rto != null ? String(p.rto) : "", rpo: p.rpo != null ? String(p.rpo) : "",
      status: p.status, related_assets: assetIds,
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveProcess(e: React.FormEvent) {
    e.preventDefault();
    if (!form.process_name.trim()) { showToast("Process name is required", "err"); return; }
    setLoading(true);
    try {
      const payload = {
        process_name:     form.process_name.trim(),
        process_owner:    form.process_owner  || null,
        department:       form.department     || null,
        related_it_system: form.related_it_system || null,
        priority_level:   form.priority_level,
        mtpd:             form.mtpd ? Number(form.mtpd) : null,
        rto:              form.rto  ? Number(form.rto)  : null,
        rpo:              form.rpo  ? Number(form.rpo)  : null,
        status:           form.status,
        related_assets:   form.related_assets,
      };
      const url    = editId ? `/api/bia/processes/${editId}` : "/api/bia/processes";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(editId ? "✅ Process updated" : "✅ Process registered");
        setForm(emptyForm); setEditId(null); setShowForm(false);
        await refreshProcesses();
      } else {
        const d = await res.json();
        showToast(`❌ ${d.error}`, "err");
      }
    } finally { setLoading(false); }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete process "${name}"? This will also remove its impact scores.`)) return;
    const res = await fetch(`/api/bia/processes/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("🗑 Process deleted"); await refreshProcesses(); }
    else showToast("❌ Delete failed", "err");
  }

  // ── Impact assessment ─────────────────────────────────────────────────────
  async function loadImpact(processId: number) {
    const r = await fetch(`/api/bia/impact?processId=${processId}&orgId=${orgId}`);
    if (r.ok) {
      const data = await r.json();
      setImpactForm(data ? {
        impact_1h: data.impact_1h, impact_4h: data.impact_4h,
        impact_24h: data.impact_24h, impact_7d: data.impact_7d,
        financial_impact: data.financial_impact, legal_impact: data.legal_impact,
        operational_impact: data.operational_impact, reputation_impact: data.reputation_impact,
        customer_impact: data.customer_impact,
        financial_loss_per_hour: data.financial_loss_per_hour,
      } : { ...DEFAULT_IMPACT });
    }
  }

  async function handleSaveImpact() {
    if (!selProcId) return;
    setSavingImpact(true);
    try {
      const res = await fetch("/api/bia/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId: selProcId, orgId, ...impactForm }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Impact saved — Priority: ${data.priority}, RTO: ${fmtHours(data.rto)}, RPO: ${fmtHours(data.rpo)}`);
        await refreshProcesses();
      } else showToast(`❌ ${data.error}`, "err");
    } finally { setSavingImpact(false); }
  }

  // Auto-calculated suggestion
  const autoCalc = useMemo(() => {
    const maxImpact = calcMaxTimeImpact(
      impactForm.impact_1h, impactForm.impact_4h,
      impactForm.impact_24h, impactForm.impact_7d,
    );
    return {
      priority:   calcPriority(maxImpact),
      rto:        calcRTO(maxImpact),
      rpo:        calcRPO(maxImpact),
      maxImpact,
    };
  }, [impactForm]);

  const selectedProcess = processes.find(p => p.id === Number(selProcId));

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl shadow-xl text-sm font-medium
          ${toast.type === "ok" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {([
          { id: "register",  label: "A. Process Register", icon: ClipboardList },
          { id: "assess",    label: "B. Impact Assessment", icon: Activity },
          { id: "dashboard", label: "C. BIA Dashboard",    icon: BarChart2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === id ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB A: PROCESS REGISTER ──────────────────────────────────────── */}
      {tab === "register" && (
        <div className="space-y-5">
          {/* Add process button / header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {processes.length} process{processes.length !== 1 ? "es" : ""} registered
            </p>
            <button
              onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(s => !s); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              {showForm && !editId ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showForm && !editId ? "Cancel" : "Add Process"}
            </button>
          </div>

          {/* Process form */}
          {showForm && (
            <form onSubmit={handleSaveProcess} className="bg-white border border-blue-200 rounded-2xl p-6 space-y-5 shadow-sm">
              <h3 className="font-bold text-gray-900">{editId ? "Edit Process" : "Register New Process"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Process Name */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Process Name *</label>
                  <input
                    value={form.process_name}
                    onChange={e => setForm(f => ({ ...f, process_name: e.target.value }))}
                    required
                    placeholder="e.g. Payment Processing"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                {/* Process Owner */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    <User size={10} className="inline mr-1" />Process Owner
                  </label>
                  <input
                    value={form.process_owner}
                    onChange={e => setForm(f => ({ ...f, process_owner: e.target.value }))}
                    placeholder="Name / Role"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                {/* Department */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    <Building2 size={10} className="inline mr-1" />Department
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                  >
                    <option value="">— Select —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* Related IT System */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    <Cpu size={10} className="inline mr-1" />Related IT System
                  </label>
                  <input
                    value={form.related_it_system}
                    onChange={e => setForm(f => ({ ...f, related_it_system: e.target.value }))}
                    placeholder="e.g. ERP, CRM, Core Banking"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                {/* Priority Level */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority Level</label>
                  <select
                    value={form.priority_level}
                    onChange={e => setForm(f => ({ ...f, priority_level: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                  >
                    {["Critical", "High", "Medium", "Low"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Auto-updated when Impact Assessment is saved</p>
                </div>
                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                {/* MTPD */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    <Clock size={10} className="inline mr-1" />MTPD (hours)
                    <span className="text-gray-400 font-normal ml-1">Max Tolerable Period of Disruption</span>
                  </label>
                  <input
                    type="number" min="0" step="0.5"
                    value={form.mtpd}
                    onChange={e => setForm(f => ({ ...f, mtpd: e.target.value }))}
                    placeholder="e.g. 48"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                {/* RTO */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">RTO (hours)
                    <span className="text-gray-400 font-normal ml-1">Recovery Time Objective</span>
                  </label>
                  <input
                    type="number" min="0" step="0.5"
                    value={form.rto}
                    onChange={e => setForm(f => ({ ...f, rto: e.target.value }))}
                    placeholder="Auto-suggested from impact scores"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                {/* RPO */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">RPO (hours)
                    <span className="text-gray-400 font-normal ml-1">Recovery Point Objective</span>
                  </label>
                  <input
                    type="number" min="0" step="0.5"
                    value={form.rpo}
                    onChange={e => setForm(f => ({ ...f, rpo: e.target.value }))}
                    placeholder="Auto-suggested from impact scores"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>

              {/* Related Assets multi-select */}
              {riskAssets.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">
                    <Link2 size={10} className="inline mr-1" />Related Assets (from Risk Register)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {riskAssets.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={form.related_assets.includes(a.id)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...form.related_assets, a.id]
                              : form.related_assets.filter(x => x !== a.id);
                            setForm(f => ({ ...f, related_assets: ids }));
                          }}
                          className="accent-blue-600"
                        />
                        <span className="text-gray-700 truncate">{a.name}</span>
                        <span className="text-gray-400 ml-auto">{a.type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2 rounded-xl text-sm transition">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editId ? "Update Process" : "Register Process"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Process list */}
          {processes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
              <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No processes registered yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Process" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processes.map(p => {
                const c = PRIORITY_COLORS[p.priority_level as PriorityLevel] ?? PRIORITY_COLORS.Low;
                return (
                  <div key={p.id}
                    className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow ${
                      p.priority_level === "Critical" ? "border-l-4 border-l-red-500" : ""
                    }`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{p.process_name}</p>
                          <PriorityBadge level={p.priority_level} />
                          {p.status === "Inactive" && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                          {p.has_impact ? (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">Impact assessed</span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Impact pending</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                          {p.process_owner && <span><User size={10} className="inline" /> {p.process_owner}</span>}
                          {p.department    && <span><Building2 size={10} className="inline" /> {p.department}</span>}
                          {p.related_it_system && <span><Cpu size={10} className="inline" /> {p.related_it_system}</span>}
                        </div>
                      </div>
                      {/* RTO/RPO/MTPD badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: "RTO", val: p.rto, color: "bg-blue-50 text-blue-700" },
                          { label: "RPO", val: p.rpo, color: "bg-purple-50 text-purple-700" },
                          { label: "MTPD", val: p.mtpd, color: "bg-gray-50 text-gray-600" },
                        ].map(({ label, val, color }) => val != null && (
                          <div key={label} className={`text-center px-3 py-1.5 rounded-lg ${color}`}>
                            <p className="text-sm font-bold">{fmtHours(val)}</p>
                            <p className="text-xs opacity-70">{label}</p>
                          </div>
                        ))}
                        {p.financial_loss_per_hour != null && p.financial_loss_per_hour > 0 && (
                          <div className="text-center px-3 py-1.5 rounded-lg bg-red-50 text-red-700">
                            <p className="text-sm font-bold">฿{p.financial_loss_per_hour.toLocaleString()}</p>
                            <p className="text-xs opacity-70">Loss/hr</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => { setSelProcId(p.id); loadImpact(p.id); setTab("assess"); }}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Activity size={12} /> {p.has_impact ? "Edit Impact" : "Assess Impact"}
                      </button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => startEdit(p)}
                        className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => handleDelete(p.id, p.process_name)}
                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB B: IMPACT ASSESSMENT ─────────────────────────────────────── */}
      {tab === "assess" && (
        <div className="space-y-5">
          {/* Process selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Select Process to Assess</h3>
            {processes.length === 0 ? (
              <p className="text-sm text-gray-400">Register a process first in Tab A.</p>
            ) : (
              <select
                value={selProcId}
                onChange={async e => {
                  const id = Number(e.target.value);
                  setSelProcId(id || "");
                  if (id) await loadImpact(id);
                  else setImpactForm({ ...DEFAULT_IMPACT });
                }}
                className="w-full sm:w-96 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
              >
                <option value="">— Select a process —</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.process_name} {p.has_impact ? "✓" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selProcId && (
            <>
              {/* Time window impact */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-1">Time Window Impact</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Rate the business impact if the process is down for each duration. 1=Negligible → 5=Critical
                </p>

                {/* Score legend */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`text-xs px-2 py-0.5 rounded font-medium ${impactBgClass(n)}`}>
                      {n} — {BIA_IMPACT_LABELS[n]}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  {TIME_ROWS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
                      <ScoreSelector
                        value={impactForm[key] as number}
                        onChange={v => setImpactForm(f => ({ ...f, [key]: v }))}
                      />
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${impactBgClass(impactForm[key] as number)}`}>
                        {BIA_IMPACT_LABELS[impactForm[key] as number]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact type assessment */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-1">Impact Type Assessment</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Rate each impact category if the process is disrupted. 1=Negligible → 5=Critical
                </p>
                <div className="space-y-3">
                  {TYPE_ROWS.map(({ key, label, icon }) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 w-28 shrink-0">{icon} {label}</span>
                      <ScoreSelector
                        value={impactForm[key] as number}
                        onChange={v => setImpactForm(f => ({ ...f, [key]: v }))}
                      />
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${impactBgClass(impactForm[key] as number)}`}>
                        {BIA_IMPACT_LABELS[impactForm[key] as number]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial loss */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-1">Financial Exposure</h3>
                <p className="text-xs text-gray-500 mb-4">Estimated financial loss per hour of downtime (THB)</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 font-medium">฿</span>
                  <input
                    type="number" min="0" step="100"
                    value={impactForm.financial_loss_per_hour}
                    onChange={e => setImpactForm(f => ({ ...f, financial_loss_per_hour: Number(e.target.value) }))}
                    placeholder="e.g. 50000"
                    className="w-48 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                  <span className="text-sm text-gray-500">per hour</span>
                  {impactForm.financial_loss_per_hour > 0 && (
                    <span className="text-sm text-red-600 font-medium">
                      = ฿{(impactForm.financial_loss_per_hour * 24).toLocaleString()}/day
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-calculated preview */}
              <div className={`rounded-2xl border-2 p-5 ${
                autoCalc.priority === "Critical" ? "bg-red-50 border-red-200" :
                autoCalc.priority === "High"     ? "bg-orange-50 border-orange-200" :
                autoCalc.priority === "Medium"   ? "bg-yellow-50 border-yellow-200" :
                                                   "bg-green-50 border-green-200"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-gray-500" />
                  <span className="text-sm font-bold text-gray-900">Auto-calculated from Impact Scores</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Suggested Priority</p>
                    <PriorityBadge level={autoCalc.priority} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Suggested RTO</p>
                    <p className="font-bold text-blue-700">{fmtHours(autoCalc.rto)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Suggested RPO</p>
                    <p className="font-bold text-purple-700">{fmtHours(autoCalc.rpo)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Max Time Impact</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${impactBgClass(autoCalc.maxImpact)}`}>
                      {autoCalc.maxImpact} — {BIA_IMPACT_LABELS[autoCalc.maxImpact]}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  These values will be applied to the process record automatically when you save.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveImpact}
                  disabled={savingImpact}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
                >
                  {savingImpact ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><CheckCircle2 size={14} /> Save Impact Assessment</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB C: BIA DASHBOARD ─────────────────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Processes", val: stats.total,
                  icon: "📋", color: "text-gray-800", bg: "bg-gray-50 border-gray-200",
                },
                {
                  label: "Critical Processes", val: stats.critical,
                  icon: "🔴", color: "text-red-700", bg: "bg-red-50 border-red-200",
                },
                {
                  label: "Avg RTO",
                  val: stats.avgRto != null ? fmtHours(stats.avgRto) : "—",
                  icon: "⏱", color: "text-blue-700", bg: "bg-blue-50 border-blue-200",
                },
                {
                  label: "Est. Loss/Day",
                  val: stats.totalLossPerDay > 0 ? `฿${stats.totalLossPerDay.toLocaleString()}` : "—",
                  icon: "💸", color: "text-orange-700", bg: "bg-orange-50 border-orange-200",
                },
              ].map(({ label, val, icon, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Export button */}
          <div className="flex justify-end">
            <ExportPDFButton
              href={`/api/pdf/bia?orgId=${orgId}`}
              label="Export BIA Report PDF"
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            />
          </div>

          {/* Process table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Business Process Register</h3>
              <p className="text-xs text-gray-500 mt-0.5">Full BIA summary — all processes with RTO/RPO and financial exposure</p>
            </div>
            {processes.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No processes registered</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Process Name", "Department", "Owner", "Priority", "RTO", "RPO", "MTPD", "Loss/hr (฿)", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {processes.map((p, idx) => (
                      <tr key={p.id} className={`${idx % 2 === 1 ? "bg-gray-50/50" : ""} ${
                        p.priority_level === "Critical" ? "border-l-4 border-l-red-400" : ""
                      }`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.process_name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.department ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{p.process_owner ?? "—"}</td>
                        <td className="px-4 py-3"><PriorityBadge level={p.priority_level} /></td>
                        <td className="px-4 py-3 font-mono text-blue-700 font-bold">{fmtHours(p.rto)}</td>
                        <td className="px-4 py-3 font-mono text-purple-700 font-bold">{fmtHours(p.rpo)}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{fmtHours(p.mtpd)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">
                          {p.financial_loss_per_hour ? p.financial_loss_per_hour.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Impact heatmap summary */}
          {processes.some(p => p.has_impact) && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Impact Score Heatmap</h3>
                <p className="text-xs text-gray-500 mt-0.5">Time window impact scores by process</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Process</th>
                      {["1h", "4h", "24h", "7d", "Financial", "Legal", "Operational", "Reputation", "Customer"].map(h => (
                        <th key={h} className="px-2 py-2 text-center font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {processes.filter(p => p.has_impact).map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-medium text-gray-900 max-w-[160px] truncate">{p.process_name}</td>
                        {[
                          p.impact_1h, p.impact_4h, p.impact_24h, p.impact_7d,
                          p.financial_impact, p.legal_impact, p.operational_impact,
                          p.reputation_impact, p.customer_impact,
                        ].map((score, i) => (
                          <td key={i} className="px-2 py-2 text-center">
                            <span className={`inline-block w-7 h-7 rounded text-xs font-bold leading-7 ${impactBgClass(score ?? 1)}`}>
                              {score ?? "—"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
