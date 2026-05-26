"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, Save, Loader2, CheckCircle2, AlertTriangle,
  ArrowRight, BarChart2, ListChecks, RefreshCw, AlertCircle,
} from "lucide-react";
import ExportPDFButton from "@/components/shared/ExportPDFButton";

// ── Types ────────────────────────────────────────────────────────────────────
interface Framework {
  id: number;
  name: string;
  version: string;
  description: string;
  requirement_count: number;
}

interface Requirement {
  id: number;
  framework_id: number;
  requirement_id: string;
  requirement_name: string;
  domain: string;
  description: string;
  guidance: string;
  sort_order: number;
}

type GapStatus = "Compliant" | "Partially Compliant" | "Non-Compliant" | "Not Applicable" | "";

interface AssessmentRow {
  id?: number;
  status: GapStatus;
  evidence_reference: string;
  comment: string;
  responsible_person: string;
  gap_severity: "High" | "Medium" | "Low" | "";
  converted_to_risk: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: GapStatus[] = [
  "Compliant", "Partially Compliant", "Non-Compliant", "Not Applicable",
];

const STATUS_COLORS: Record<string, string> = {
  "Compliant":           "bg-green-100 text-green-700 border-green-300",
  "Partially Compliant": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Non-Compliant":       "bg-red-100 text-red-700 border-red-300",
  "Not Applicable":      "bg-gray-100 text-gray-500 border-gray-300",
  "":                    "bg-white text-gray-400 border-gray-200",
};

const DOMAIN_COLORS: Record<string, string> = {
  "Organizational":    "bg-blue-100 text-blue-700",
  "People":            "bg-purple-100 text-purple-700",
  "Physical":          "bg-orange-100 text-orange-700",
  "Technological":     "bg-indigo-100 text-indigo-700",
  "Data Governance":   "bg-teal-100 text-teal-700",
  "Data Subject Rights": "bg-pink-100 text-pink-700",
  "Technical Security": "bg-red-100 text-red-700",
  "Incident Management": "bg-amber-100 text-amber-700",
  "Third Party":       "bg-slate-100 text-slate-700",
};

const FRAMEWORK_ICONS: Record<string, string> = {
  "ISO 27001:2022": "🛡️",
  "PDPA Thailand":  "🔒",
};

// ── Readiness calculation ──────────────────────────────────────────────────────
function calcScore(rows: AssessmentRow[]): number {
  const applicable = rows.filter(r => r.status && r.status !== "Not Applicable");
  if (!applicable.length) return 0;
  const pts = applicable.reduce((s, r) => {
    if (r.status === "Compliant")           return s + 100;
    if (r.status === "Partially Compliant") return s + 50;
    return s;
  }, 0);
  return Math.round((pts / (applicable.length * 100)) * 100);
}

function domainScores(reqs: Requirement[], map: Record<number, AssessmentRow>) {
  const domains = Array.from(new Set(reqs.map(r => r.domain)));
  return domains.map(domain => {
    const dReqs  = reqs.filter(r => r.domain === domain);
    const dRows  = dReqs.map(r => map[r.id]).filter(Boolean);
    const score  = calcScore(dRows);
    const counts = { total: dReqs.length, assessed: dRows.filter(r => r.status).length };
    return { domain, score, ...counts };
  });
}

// ── Score Ring Component ──────────────────────────────────────────────────────
function ScoreRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r    = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f97316" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GapAnalysis({
  initialFrameworks,
  orgId = 1,
}: {
  initialFrameworks: Framework[];
  orgId?: number;
}) {
  type View = "select" | "checklist" | "dashboard";
  const [view,         setView]       = useState<View>("select");
  const [framework,    setFramework]  = useState<Framework | null>(null);
  const [requirements, setReqs]       = useState<Requirement[]>([]);
  const [asmMap,       setAsmMap]     = useState<Record<number, AssessmentRow>>({});
  const [loading,      setLoading]    = useState(false);
  const [saving,       setSaving]     = useState(false);
  const [saveOk,       setSaveOk]     = useState(false);
  const [converting,   setConverting] = useState<number | null>(null);
  const [toast,        setToast]      = useState<string | null>(null);
  const [openGuidance, setOpenGuidance] = useState<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Load requirements + existing assessments when framework chosen
  const loadFramework = useCallback(async (fw: Framework) => {
    setFramework(fw);
    setLoading(true);
    try {
      const [reqRes, asmRes] = await Promise.all([
        fetch(`/api/gap/requirements?frameworkId=${fw.id}`),
        fetch(`/api/gap/assessments?frameworkId=${fw.id}&orgId=${orgId}`),
      ]);
      const reqs: Requirement[] = await reqRes.json();
      const asms: any[]         = await asmRes.json();

      setReqs(reqs);

      // Build map reqId → assessment
      const map: Record<number, AssessmentRow> = {};
      for (const r of reqs) {
        map[r.id] = { status: "", evidence_reference: "", comment: "", responsible_person: "", gap_severity: "", converted_to_risk: false };
      }
      for (const a of asms) {
        map[a.requirement_id] = {
          id:                 a.id,
          status:             a.status ?? "",
          evidence_reference: a.evidence_reference ?? "",
          comment:            a.comment ?? "",
          responsible_person: a.responsible_person ?? "",
          gap_severity:       a.gap_severity ?? "",
          converted_to_risk:  !!a.converted_to_risk,
        };
      }
      setAsmMap(map);
      setView("checklist");
    } finally { setLoading(false); }
  }, [orgId]);

  function updateField(reqId: number, field: keyof AssessmentRow, value: string | boolean) {
    setAsmMap(prev => ({ ...prev, [reqId]: { ...prev[reqId], [field]: value } }));
    setSaveOk(false);
  }

  async function handleSave() {
    if (!framework) return;
    setSaving(true); setSaveOk(false);
    try {
      const assessments = requirements.map(r => ({
        requirementId:     r.id,
        status:            asmMap[r.id]?.status || "Non-Compliant",
        evidenceReference: asmMap[r.id]?.evidence_reference,
        comment:           asmMap[r.id]?.comment,
        responsiblePerson: asmMap[r.id]?.responsible_person,
        gapSeverity:       asmMap[r.id]?.gap_severity,
      }));
      const res = await fetch("/api/gap/assessments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ frameworkId: framework.id, orgId, assessments }),
      });
      if (res.ok) { setSaveOk(true); showToast("✅ Assessment saved successfully!"); }
    } finally { setSaving(false); }
  }

  async function convertToRisk(reqId: number, gapAsmId: number | undefined) {
    if (!gapAsmId) { showToast("⚠ Please save the assessment first before converting."); return; }
    setConverting(reqId);
    try {
      const res = await fetch("/api/gap/convert", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ gapAssessmentId: gapAsmId, orgId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAsmMap(prev => ({ ...prev, [reqId]: { ...prev[reqId], converted_to_risk: true } }));
        showToast(`✅ Converted to Risk #${data.riskId} — Level: ${data.riskLevel} (Score: ${data.inherentRisk})`);
      } else {
        showToast(`❌ ${data.error}`);
      }
    } finally { setConverting(null); }
  }

  // ── Grouped requirements ───────────────────────────────────────────────────
  const domains = Array.from(new Set(requirements.map(r => r.domain)));
  const byDomain = (d: string) => requirements.filter(r => r.domain === d);

  // Summary counts
  const allRows  = requirements.map(r => asmMap[r.id]).filter(Boolean);
  const overall  = calcScore(allRows);
  const domStats = domainScores(requirements, asmMap);
  const counts   = {
    compliant:  allRows.filter(r => r.status === "Compliant").length,
    partial:    allRows.filter(r => r.status === "Partially Compliant").length,
    nonComp:    allRows.filter(r => r.status === "Non-Compliant").length,
    na:         allRows.filter(r => r.status === "Not Applicable").length,
  };
  const topWeak = requirements
    .filter(r => asmMap[r.id]?.status === "Non-Compliant")
    .sort((a, b) => {
      const sev = { High: 3, Medium: 2, Low: 1 } as Record<string, number>;
      return (sev[asmMap[b.id]?.gap_severity ?? ""] ?? 0) - (sev[asmMap[a.id]?.gap_severity ?? ""] ?? 0);
    })
    .slice(0, 5);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl shadow-xl bg-gray-900 text-white text-sm font-medium">
          {toast}
        </div>
      )}

      {/* STEP 1 — Framework selection */}
      {view === "select" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Step 1 — เลือก Framework</h2>
            <p className="text-sm text-gray-500 mt-1">เลือก Framework ที่ต้องการประเมิน GAP</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialFrameworks.map(fw => (
              <button
                key={fw.id}
                onClick={() => loadFramework(fw)}
                disabled={loading}
                className="flex flex-col items-start text-left p-5 bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-md rounded-2xl transition-all group"
              >
                <div className="text-3xl mb-3">{FRAMEWORK_ICONS[fw.name] ?? "📋"}</div>
                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition">
                  {fw.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Version {fw.version}</p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2">{fw.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <ListChecks size={12} />
                  {fw.requirement_count} requirements
                  <ChevronRight size={12} className="ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading requirements…
            </div>
          )}
        </div>
      )}

      {/* STEP 2+3 — Checklist */}
      {view === "checklist" && framework && (
        <div className="space-y-5">
          {/* Sub-nav */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <button onClick={() => setView("select")} className="hover:text-blue-600 transition">
                  Framework
                </button>
                <ChevronRight size={12} />
                <span className="text-gray-800 font-medium">{framework.name}</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{framework.name} — Checklist</h2>
              <p className="text-sm text-gray-500">{requirements.length} requirements · ประเมินสถานะแต่ละข้อ</p>
            </div>
            <div className="flex items-center gap-2">
              {saveOk && (
                <button
                  onClick={() => setView("dashboard")}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  <BarChart2 size={14} /> View Dashboard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : saveOk
                    ? <><CheckCircle2 size={14} /> Saved!</>
                    : <><Save size={14} /> Save Assessment</>
                }
              </button>
            </div>
          </div>

          {/* Progress summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Compliant",           val: counts.compliant, color: "bg-green-50 border-green-200 text-green-700" },
              { label: "Partially Compliant", val: counts.partial,   color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
              { label: "Non-Compliant",       val: counts.nonComp,   color: "bg-red-50 border-red-200 text-red-700" },
              { label: "Not Applicable",      val: counts.na,        color: "bg-gray-50 border-gray-200 text-gray-600" },
            ].map(({ label, val, color }) => (
              <div key={label} className={`border rounded-xl px-4 py-3 ${color}`}>
                <p className="text-2xl font-black">{val}</p>
                <p className="text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Requirements by domain */}
          <div className="space-y-6">
            {domains.map(domain => (
              <div key={domain} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DOMAIN_COLORS[domain] ?? "bg-gray-100 text-gray-700"}`}>
                      {domain}
                    </span>
                    <span className="text-sm text-gray-500">{byDomain(domain).length} controls</span>
                  </div>
                  {/* domain score */}
                  {(() => {
                    const stat = domStats.find(d => d.domain === domain);
                    const score = stat?.score ?? 0;
                    return stat?.assessed ? (
                      <span className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                        {score}%
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="divide-y divide-gray-50">
                  {byDomain(domain).map(req => {
                    const asm = asmMap[req.id] ?? { status: "", evidence_reference: "", comment: "", responsible_person: "", gap_severity: "", converted_to_risk: false };
                    const isNonComp = asm.status === "Non-Compliant";
                    return (
                      <div key={req.id} className={`px-5 py-4 space-y-3 ${isNonComp ? "bg-red-50/30" : ""}`}>
                        {/* Requirement header */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                                {req.requirement_id}
                              </span>
                              <p className="text-sm font-semibold text-gray-900">{req.requirement_name}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{req.description}</p>
                            {/* Guidance toggle */}
                            {req.guidance && (
                              <button
                                onClick={() => setOpenGuidance(openGuidance === req.id ? null : req.id)}
                                className="text-xs text-blue-600 hover:underline mt-1"
                              >
                                {openGuidance === req.id ? "▲ Hide guidance" : "▼ Show guidance"}
                              </button>
                            )}
                            {openGuidance === req.id && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
                                💡 {req.guidance}
                              </div>
                            )}
                          </div>

                          {/* Status dropdown */}
                          <select
                            value={asm.status}
                            onChange={e => updateField(req.id, "status", e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 border rounded-lg outline-none cursor-pointer shrink-0 ${STATUS_COLORS[asm.status]}`}
                          >
                            <option value="">— Select Status —</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        {/* Detail fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={asm.evidence_reference}
                            onChange={e => updateField(req.id, "evidence_reference", e.target.value)}
                            placeholder="Evidence Reference (Doc ID, URL…)"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white"
                          />
                          <input
                            type="text"
                            value={asm.responsible_person}
                            onChange={e => updateField(req.id, "responsible_person", e.target.value)}
                            placeholder="Responsible Person"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white"
                          />
                          {isNonComp ? (
                            <select
                              value={asm.gap_severity}
                              onChange={e => updateField(req.id, "gap_severity", e.target.value)}
                              className="text-xs px-3 py-2 border border-red-300 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
                            >
                              <option value="">Gap Severity…</option>
                              <option value="High">🔴 High</option>
                              <option value="Medium">🟡 Medium</option>
                              <option value="Low">🟢 Low</option>
                            </select>
                          ) : (
                            <div />
                          )}
                        </div>

                        {/* Comment */}
                        <textarea
                          value={asm.comment}
                          onChange={e => updateField(req.id, "comment", e.target.value)}
                          placeholder="Comment / หมายเหตุ (ไม่บังคับ)"
                          rows={2}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-none bg-white"
                        />

                        {/* Convert to Risk */}
                        {isNonComp && (
                          <div className="flex items-center gap-3">
                            {asm.converted_to_risk ? (
                              <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-semibold">
                                <CheckCircle2 size={12} /> Converted to Risk
                              </span>
                            ) : (
                              <button
                                onClick={() => convertToRisk(req.id, asm.id)}
                                disabled={converting === req.id}
                                className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-3 py-1.5 rounded-full transition"
                              >
                                {converting === req.id
                                  ? <><Loader2 size={10} className="animate-spin" /> Converting…</>
                                  : <><AlertTriangle size={10} /> Convert to Risk</>
                                }
                              </button>
                            )}
                            {!saveOk && !asm.id && (
                              <span className="text-xs text-amber-600">⚠ Save first to enable convert</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Save button (bottom) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : saveOk ? <><CheckCircle2 size={14} /> Saved!</>
                : <><Save size={14} /> Save All Assessments</>
              }
            </button>
            {saveOk && (
              <button
                onClick={() => setView("dashboard")}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
              >
                <BarChart2 size={14} /> View Readiness Dashboard →
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4 — Dashboard */}
      {view === "dashboard" && framework && (
        <div className="space-y-6">
          {/* Sub-nav */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <button onClick={() => setView("select")} className="hover:text-blue-600">Framework</button>
                <ChevronRight size={12} />
                <button onClick={() => setView("checklist")} className="hover:text-blue-600">{framework.name}</button>
                <ChevronRight size={12} />
                <span className="text-gray-800 font-medium">Dashboard</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Readiness Dashboard — {framework.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <ExportPDFButton
                href={`/api/pdf/gap-analysis?frameworkId=${framework.id}&orgId=${orgId}`}
                label="Export GAP Report PDF"
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
              />
              <button
                onClick={() => setView("checklist")}
                className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                <ListChecks size={13} /> Edit Checklist
              </button>
            </div>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative shrink-0">
                <ScoreRing pct={overall} size={120} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-white">{overall}%</span>
                  <span className="text-xs text-blue-200">Overall</span>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {overall >= 80 ? "✅ High Readiness" : overall >= 50 ? "⚠️ Moderate Readiness" : "❌ Low Readiness"}
                </p>
                <p className="text-blue-100 text-sm mt-1">{framework.name} · {requirements.length} requirements assessed</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-green-300">✓ {counts.compliant} Compliant</span>
                  <span className="text-yellow-300">◑ {counts.partial} Partial</span>
                  <span className="text-red-300">✗ {counts.nonComp} Non-Compliant</span>
                  <span className="text-gray-300">— {counts.na} N/A</span>
                </div>
              </div>
            </div>
          </div>

          {/* By Domain */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Readiness by Domain</h3>
            <div className="space-y-3">
              {domStats.map(({ domain, score, total, assessed }) => (
                <div key={domain}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DOMAIN_COLORS[domain] ?? "bg-gray-100 text-gray-700"}`}>
                        {domain}
                      </span>
                      <span className="text-xs text-gray-400">{assessed}/{total} assessed</span>
                    </div>
                    <span className={`font-bold text-sm ${score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {assessed ? `${score}%` : "—"}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${assessed ? score : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Weak Areas + Summary counts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Weak areas */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                Top {Math.min(5, topWeak.length)} Weak Areas (Non-Compliant)
              </h3>
              {topWeak.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No non-compliant items 🎉</p>
              ) : (
                <div className="space-y-2">
                  {topWeak.map(req => {
                    const asm = asmMap[req.id];
                    return (
                      <div key={req.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-red-700">{req.requirement_id}</span>
                            <p className="text-xs font-semibold text-gray-900 truncate">{req.requirement_name}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{req.domain}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {asm?.gap_severity && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                              asm.gap_severity === "High" ? "bg-red-200 text-red-800"
                                : asm.gap_severity === "Medium" ? "bg-yellow-200 text-yellow-800"
                                : "bg-gray-200 text-gray-700"
                            }`}>
                              {asm.gap_severity}
                            </span>
                          )}
                          {asm?.converted_to_risk && (
                            <span className="text-xs text-green-600 font-medium">→ Risk created</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary counts */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Assessment Summary</h3>
              {[
                { label: "Compliant",           val: counts.compliant, pct: Math.round(counts.compliant / (requirements.length || 1) * 100), color: "bg-green-500" },
                { label: "Partially Compliant", val: counts.partial,   pct: Math.round(counts.partial   / (requirements.length || 1) * 100), color: "bg-yellow-500" },
                { label: "Non-Compliant",       val: counts.nonComp,   pct: Math.round(counts.nonComp   / (requirements.length || 1) * 100), color: "bg-red-500" },
                { label: "Not Applicable",      val: counts.na,        pct: Math.round(counts.na        / (requirements.length || 1) * 100), color: "bg-gray-400" },
              ].map(({ label, val, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold text-gray-900">{val} <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                Non-Compliant with Risk Created:
                <strong className="text-gray-700 ml-1">
                  {Object.values(asmMap).filter(a => a.converted_to_risk).length}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
