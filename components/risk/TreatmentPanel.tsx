"use client";

import { useState, useEffect, useCallback } from "react";
import { RISK_COLORS } from "@/lib/risk-utils";
import {
  ChevronDown, ChevronUp, Save, Loader2, CheckCircle,
  AlertTriangle, Shield, Clock, DollarSign, Target,
} from "lucide-react";

export interface RiskRow {
  id: number;
  threat_name: string;
  asset_name: string;
  asset_type: string;
  inherent_risk: number;
  risk_level: string;
  likelihood: number;
  impact: number;
  organization_id: number;
}

const TREATMENT_OPTIONS = [
  { value: "Mitigate", label: "🛡️ Mitigate",  desc: "ลดความเสี่ยงด้วยมาตรการควบคุม",  color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "Transfer", label: "🔄 Transfer",  desc: "โอนความเสี่ยงให้บุคคลที่สาม (เช่น ประกันภัย)", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "Avoid",    label: "🚫 Avoid",     desc: "หลีกเลี่ยงกิจกรรมที่ก่อให้เกิดความเสี่ยง",  color: "bg-red-100 text-red-700 border-red-300" },
  { value: "Accept",   label: "✅ Accept",    desc: "ยอมรับความเสี่ยง พร้อมติดตามอย่างใกล้ชิด",   color: "bg-gray-100 text-gray-700 border-gray-300" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  "To Do":                   "bg-gray-100 text-gray-600",
  "In Progress":             "bg-blue-100 text-blue-700",
  "Pending Evidence":        "bg-yellow-100 text-yellow-700",
  "Under Review":            "bg-orange-100 text-orange-700",
  "Done":                    "bg-green-100 text-green-700",
  "Accepted by Management":  "bg-purple-100 text-purple-700",
};

interface TreatmentData {
  id?: number;
  treatment_option: string;
  action_plan: string;
  owner: string;
  due_date: string;
  budget: string;
  expected_residual_risk: string;
  status: string;
}

const EMPTY: TreatmentData = {
  treatment_option: "Mitigate",
  action_plan: "",
  owner: "",
  due_date: "",
  budget: "",
  expected_residual_risk: "",
  status: "To Do",
};

export default function TreatmentPanel({ risk, orgId }: { risk: RiskRow; orgId: number }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form,    setForm]    = useState<TreatmentData>(EMPTY);

  const level  = risk.risk_level as keyof typeof RISK_COLORS;
  const colors = RISK_COLORS[level] ?? RISK_COLORS.Low;

  const loadTreatment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/risk/treatments?riskId=${risk.id}&orgId=${orgId}`);
      if (!res.ok) return;
      const rows = await res.json();
      if (rows.length > 0) {
        const t = rows[0];
        setForm({
          id:                    t.id,
          treatment_option:      t.treatment_option    ?? "Mitigate",
          action_plan:           t.action_plan         ?? "",
          owner:                 t.owner               ?? "",
          due_date:              t.due_date             ?? "",
          budget:                t.budget != null ? String(t.budget) : "",
          expected_residual_risk: t.expected_residual_risk != null
            ? String(t.expected_residual_risk) : "",
          status:                t.status              ?? "To Do",
        } as TreatmentData);
      }
    } finally { setLoading(false); }
  }, [risk.id, orgId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/risk/treatments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskId:               risk.id,
          orgId,
          treatmentOption:      form.treatment_option,
          actionPlan:           form.action_plan,
          owner:                form.owner,
          dueDate:              form.due_date,
          budget:               form.budget ? Number(form.budget) : undefined,
          expectedResidualRisk: form.expected_residual_risk
            ? Number(form.expected_residual_risk) : undefined,
          status:               form.status,
        }),
      });
      if (res.ok) setSaved(true);
    } finally { setSaving(false); }
  }

  function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) loadTreatment();
  }

  const optionMeta = TREATMENT_OPTIONS.find(o => o.value === form.treatment_option);
  const riskPct = risk.inherent_risk > 0 && form.expected_residual_risk
    ? Math.round((1 - Number(form.expected_residual_risk) / risk.inherent_risk) * 100)
    : null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all shadow-sm ${
      open ? "border-blue-200 shadow-blue-50" : "border-gray-200 hover:border-blue-200"
    }`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 border ${colors.badge}`}>
            {risk.risk_level}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{risk.threat_name}</p>
            <p className="text-xs text-gray-500">
              {risk.asset_name} · Score: <strong>{Number(risk.inherent_risk).toFixed(1)}</strong>
              {" "}· L:{risk.likelihood} × I:{risk.impact}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {form.treatment_option !== "Mitigate" || (form as any).id ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${optionMeta?.color ?? ""}`}>
              {form.treatment_option}
            </span>
          ) : null}
          {(form as any).id && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[form.status] ?? "bg-gray-100 text-gray-600"}`}>
              {form.status}
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Form panel */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <>
              {/* Treatment Option */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Shield size={14} className="text-blue-600" />
                  Treatment Option *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TREATMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, treatment_option: opt.value })); setSaved(false); }}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition ${
                        form.treatment_option === opt.value
                          ? `${opt.color} border-current`
                          : "bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <span className="font-semibold text-sm">{opt.label}</span>
                      <span className="text-xs mt-0.5 leading-tight opacity-80">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Plan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-500" />
                  Action Plan
                </label>
                <textarea
                  value={form.action_plan}
                  onChange={e => { setForm(f => ({ ...f, action_plan: e.target.value })); setSaved(false); }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="อธิบายแผนการดำเนินงานเพื่อจัดการความเสี่ยงนี้…"
                />
              </div>

              {/* Owner + Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Clock size={14} className="text-gray-500" />
                    Owner / ผู้รับผิดชอบ
                  </label>
                  <input
                    type="text"
                    value={form.owner}
                    onChange={e => { setForm(f => ({ ...f, owner: e.target.value })); setSaved(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    placeholder="ชื่อผู้รับผิดชอบ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => { setForm(f => ({ ...f, due_date: e.target.value })); setSaved(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  />
                </div>
              </div>

              {/* Budget + Expected Residual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <DollarSign size={14} className="text-green-600" />
                    Budget (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.budget}
                    onChange={e => { setForm(f => ({ ...f, budget: e.target.value })); setSaved(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Target size={14} className="text-purple-600" />
                    Expected Residual Risk Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={risk.inherent_risk}
                    step="0.1"
                    value={form.expected_residual_risk}
                    onChange={e => { setForm(f => ({ ...f, expected_residual_risk: e.target.value })); setSaved(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    placeholder={`Max ${Number(risk.inherent_risk).toFixed(1)}`}
                  />
                  {riskPct !== null && riskPct >= 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      ลดความเสี่ยงได้ <strong>{riskPct}%</strong> จากเดิม
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">สถานะ</label>
                <select
                  value={form.status}
                  onChange={e => { setForm(f => ({ ...f, status: e.target.value })); setSaved(false); }}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {["To Do","In Progress","Pending Evidence","Under Review","Done","Accepted by Management"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Save row */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Score: <strong>{Number(risk.inherent_risk).toFixed(1)}</strong>
                  {form.expected_residual_risk && (
                    <> → <strong className="text-purple-600">{Number(form.expected_residual_risk).toFixed(1)}</strong> (expected)</>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : saved
                      ? <><CheckCircle size={14} /> Saved!</>
                      : <><Save size={14} /> Save Treatment</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
