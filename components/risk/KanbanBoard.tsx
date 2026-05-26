"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RISK_COLORS } from "@/lib/risk-utils";
import {
  RefreshCw, AlertTriangle, Calendar, User, Loader2,
  ArrowRight, CheckCircle2, Clock, FileSearch, Eye, Star,
} from "lucide-react";

interface Treatment {
  id: number;
  risk_id: number;
  organization_id: number;
  treatment_option: string;
  action_plan: string | null;
  owner: string | null;
  due_date: string | null;
  budget: number | null;
  expected_residual_risk: number | null;
  residual_risk_score: number | null;
  status: string;
  updated_at: string;
  // joined
  threat_name: string;
  asset_name: string;
  asset_type: string;
  inherent_risk: number;
  risk_level: string;
  likelihood: number;
  impact: number;
}

type KanbanStatus =
  | "To Do"
  | "In Progress"
  | "Pending Evidence"
  | "Under Review"
  | "Done"
  | "Accepted by Management";

const COLUMNS: { status: KanbanStatus; label: string; icon: React.ReactNode; color: string; header: string }[] = [
  { status: "To Do",                  label: "To Do",                  icon: <Clock size={14} />,        color: "border-gray-300   bg-gray-50",   header: "bg-gray-200 text-gray-700" },
  { status: "In Progress",            label: "In Progress",            icon: <ArrowRight size={14} />,   color: "border-blue-300   bg-blue-50",   header: "bg-blue-500 text-white" },
  { status: "Pending Evidence",       label: "Pending Evidence",       icon: <FileSearch size={14} />,   color: "border-yellow-300 bg-yellow-50", header: "bg-yellow-400 text-yellow-900" },
  { status: "Under Review",           label: "Under Review",           icon: <Eye size={14} />,          color: "border-orange-300 bg-orange-50", header: "bg-orange-500 text-white" },
  { status: "Done",                   label: "Done",                   icon: <CheckCircle2 size={14} />, color: "border-green-300  bg-green-50",  header: "bg-green-600 text-white" },
  { status: "Accepted by Management", label: "Accepted",               icon: <Star size={14} />,         color: "border-purple-300 bg-purple-50", header: "bg-purple-600 text-white" },
];

const OPTION_COLORS: Record<string, string> = {
  Mitigate: "bg-blue-100 text-blue-700",
  Transfer: "bg-purple-100 text-purple-700",
  Avoid:    "bg-red-100 text-red-700",
  Accept:   "bg-gray-100 text-gray-600",
};

const RISK_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-300",
  Medium:   "bg-orange-100 text-orange-700 border border-orange-300",
  Low:      "bg-green-100 text-green-700 border border-green-300",
};

function formatDate(s: string | null) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return s; }
}

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < new Date();
}

export default function KanbanBoard({ orgId = 1 }: { orgId?: number }) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [moving,     setMoving]     = useState<number | null>(null);
  const [toast,      setToast]      = useState<{ id: number; msg: string; type: "success" | "error" } | null>(null);

  // Drag state refs (avoid re-renders during drag)
  const draggingId   = useRef<number | null>(null);
  const dragOverCol  = useRef<KanbanStatus | null>(null);
  const [dragHighlight, setDragHighlight] = useState<KanbanStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/risk/treatments?orgId=${orgId}`);
      if (res.ok) setTreatments(await res.json());
    } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    const id = Date.now();
    setToast({ id, msg, type });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  }

  // ─── Drag handlers ──────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: number) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  }

  function onDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    draggingId.current = null;
    setDragHighlight(null);
  }

  function onDragOver(e: React.DragEvent, status: KanbanStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol.current !== status) {
      dragOverCol.current = status;
      setDragHighlight(status);
    }
  }

  function onDragLeave() {
    dragOverCol.current = null;
    setDragHighlight(null);
  }

  async function onDrop(e: React.DragEvent, targetStatus: KanbanStatus) {
    e.preventDefault();
    setDragHighlight(null);
    const id = draggingId.current;
    if (!id) return;

    const current = treatments.find(t => t.id === id);
    if (!current || current.status === targetStatus) return;

    // Optimistic update
    setTreatments(prev => prev.map(t =>
      t.id === id ? { ...t, status: targetStatus } : t
    ));
    setMoving(id);

    try {
      const res = await fetch("/api/risk/treatments", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ treatmentId: id, status: targetStatus, orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Rollback
        setTreatments(prev => prev.map(t => t.id === id ? { ...t, status: current.status } : t));
        showToast(data.error ?? "Failed to update status", "error");
      } else {
        // Update residual if auto-calculated
        if (data.autoCalculated && data.residualRiskScore != null) {
          setTreatments(prev => prev.map(t =>
            t.id === id ? { ...t, residual_risk_score: data.residualRiskScore } : t
          ));
          showToast(`✅ Moved to "${targetStatus}" — Residual Risk auto-calculated: ${data.residualRiskScore}`);
        } else {
          showToast(`Moved to "${targetStatus}"`);
        }
      }
    } finally { setMoving(null); }
  }

  const byStatus = (status: KanbanStatus) => treatments.filter(t => t.status === status);
  const totalCards = treatments.length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban — Risk Treatment</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCards} risk{totalCards !== 1 ? "s" : ""} · ลากการ์ดเพื่อเปลี่ยนสถานะ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading treatments…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && totalCards === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center space-y-2">
          <p className="text-4xl">📋</p>
          <p className="font-semibold text-gray-700">ยังไม่มี Treatment Plan</p>
          <a href="/risk-treatment" className="inline-block text-blue-600 text-sm hover:underline">
            ← สร้างแผนจาก Treatment Plan
          </a>
        </div>
      )}

      {/* Kanban columns */}
      {!loading && totalCards > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "520px" }}>
          {COLUMNS.map(col => {
            const cards = byStatus(col.status);
            const isHighlighted = dragHighlight === col.status;
            return (
              <div
                key={col.status}
                className={`flex-shrink-0 w-64 flex flex-col rounded-xl border-2 transition-all ${col.color} ${
                  isHighlighted ? "ring-2 ring-blue-400 ring-offset-1 scale-[1.01]" : ""
                }`}
                onDragOver={e => onDragOver(e, col.status)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, col.status)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-[10px] ${col.header}`}>
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    {col.icon}
                    {col.label}
                  </div>
                  <span className="text-xs font-bold bg-white bg-opacity-30 px-1.5 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {cards.map(t => {
                    const overdue = isOverdue(t.due_date) && t.status !== "Done" && t.status !== "Accepted by Management";
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={e => onDragStart(e, t.id)}
                        onDragEnd={onDragEnd}
                        className={`bg-white rounded-xl p-3 shadow-sm border transition-all cursor-grab active:cursor-grabbing select-none ${
                          moving === t.id ? "opacity-40" : "hover:shadow-md hover:-translate-y-0.5"
                        } ${overdue ? "border-red-300" : "border-gray-100"}`}
                      >
                        {/* Risk name */}
                        <p className="text-xs font-bold text-gray-900 leading-tight mb-1.5">
                          {t.threat_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate mb-2">{t.asset_name}</p>

                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${RISK_BADGE[t.risk_level] ?? ""}`}>
                            {t.risk_level} {Number(t.inherent_risk).toFixed(0)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${OPTION_COLORS[t.treatment_option] ?? "bg-gray-100"}`}>
                            {t.treatment_option}
                          </span>
                        </div>

                        {/* Owner */}
                        {t.owner && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <User size={10} />
                            <span className="truncate">{t.owner}</span>
                          </div>
                        )}

                        {/* Due date */}
                        {t.due_date && (
                          <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                            <Calendar size={10} />
                            <span>{formatDate(t.due_date)}{overdue ? " ⚠ Overdue" : ""}</span>
                          </div>
                        )}

                        {/* Residual risk (when Done) */}
                        {t.residual_risk_score != null && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Residual Risk</span>
                              <span className="font-bold text-green-600">
                                {Number(t.residual_risk_score).toFixed(1)}
                                <span className="text-gray-400 font-normal ml-1">
                                  ({Math.round((1 - t.residual_risk_score / t.inherent_risk) * 100)}% reduced)
                                </span>
                              </span>
                            </div>
                          </div>
                        )}

                        {moving === t.id && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-500">
                            <Loader2 size={10} className="animate-spin" />
                            Updating…
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Drop zone placeholder */}
                  {cards.length === 0 && (
                    <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs text-gray-400 transition-all ${
                      isHighlighted ? "border-blue-400 bg-blue-50 text-blue-400" : "border-gray-200"
                    }`}>
                      {isHighlighted ? "Drop here" : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full" /> Mitigate</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded-full" /> Transfer</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded-full" /> Avoid</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-full" /> Accept</span>
        <span className="flex items-center gap-1 text-red-500"><Calendar size={10} /> Overdue = red border</span>
        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={10} /> Done = auto residual risk</span>
      </div>
    </div>
  );
}
