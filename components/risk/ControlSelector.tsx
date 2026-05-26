"use client";

import { useState, useEffect, useCallback } from "react";
import { ISO_CONTROLS, CATEGORY_NAMES, getControlsForAssetType, type ISOControl } from "@/lib/iso-controls";
import { RISK_COLORS } from "@/lib/risk-utils";
import { ShieldCheck, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

// Threshold: show control panel if inherent_risk >= this value (Medium = 25)
const CONTROL_THRESHOLD = 25;

interface Assessment {
  id: number;
  threat_name: string;
  asset_name: string;
  asset_type: string;
  risk_level: string;
  inherent_risk: number;
  likelihood: number;
  impact: number;
  organization_id?: number;
}

interface LibControl {
  id: number;
  framework: string;
  control_id: string;
  control_name: string;
  control_description: string;
  domain: string;
  related_threat: string;
}

interface ControlSelectorProps {
  assessment: Assessment;
}

export default function ControlSelector({ assessment }: ControlSelectorProps) {
  const [open,       setOpen]       = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [filter,     setFilter]     = useState<string>("All");
  const [libControls, setLibControls] = useState<LibControl[]>([]);

  const level  = assessment.risk_level as keyof typeof RISK_COLORS;
  const colors = RISK_COLORS[level] ?? RISK_COLORS.Low;
  const orgId  = assessment.organization_id ?? 1;

  // ISO controls from static lib filtered by asset type
  const isoRecommended = getControlsForAssetType(assessment.asset_type);
  const categories     = ["All", ...Array.from(new Set(isoRecommended.map(c => c.category)))];
  const filtered       = filter === "All" ? isoRecommended : isoRecommended.filter(c => c.category === filter);

  const groupedFiltered: Record<string, ISOControl[]> = {};
  for (const c of filtered) {
    groupedFiltered[c.category] = [...(groupedFiltered[c.category] ?? []), c];
  }

  // Whether risk is above threshold
  const aboveThreshold = Number(assessment.inherent_risk) >= CONTROL_THRESHOLD;

  // Load saved mappings
  const loadMappings = useCallback(async () => {
    setLoadingMap(true);
    try {
      const res = await fetch(`/api/risk/control-mappings?assessmentId=${assessment.id}&orgId=${orgId}`);
      if (!res.ok) return;
      const ids: string[] = await res.json();
      setSelected(new Set(ids));
    } finally { setLoadingMap(false); }
  }, [assessment.id, orgId]);

  // Load suggested controls from DB library
  const loadLibControls = useCallback(async () => {
    setLoadingLib(true);
    try {
      const res = await fetch(
        `/api/risk/controls?orgId=${orgId}&threat=${encodeURIComponent(assessment.threat_name)}`
      );
      if (!res.ok) return;
      const data: LibControl[] = await res.json();
      setLibControls(data);
    } finally { setLoadingLib(false); }
  }, [assessment.threat_name, orgId]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/risk/control-mappings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          assessmentId: assessment.id,
          controlIds:   Array.from(selected),
          orgId,
        }),
      });
      setSaved(true);
    } finally { setSaving(false); }
  }

  function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      loadMappings();
      loadLibControls();
    }
  }

  const libControlIds = new Set(libControls.map(c => c.control_id));

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      aboveThreshold ? "border-gray-200" : "border-gray-100 opacity-70"
    }`}>
      {/* Header row */}
      <div className={`flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors ${open ? "border-b border-gray-200" : ""}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${colors.badge}`}>
            {assessment.risk_level}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{assessment.threat_name}</p>
            <p className="text-xs text-gray-500">
              {assessment.asset_name} ({assessment.asset_type})
              {" · "}Score: <strong>{Number(assessment.inherent_risk).toFixed(1)}</strong>
              {" · "}L:{assessment.likelihood} × I:{assessment.impact}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {selected.size > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {selected.size} controls
            </span>
          )}
          {aboveThreshold ? (
            <button onClick={handleOpen}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition ${
                open ? "bg-gray-100 text-gray-700" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}>
              <ShieldCheck size={14} />
              {open ? "Close" : "จัดการมาตรการ"}
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
              ต่ำกว่า threshold
            </span>
          )}
        </div>
      </div>

      {/* Control panel */}
      {open && aboveThreshold && (
        <div className="bg-gray-50 p-5 space-y-5">

          {/* ── Suggested from DB (library controls) ──────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-amber-600" />
                <p className="text-sm font-bold text-gray-900">Suggested Controls</p>
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                  ⚠ Recommended — Consultant Review Required
                </span>
              </div>
              {loadingLib && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
            </div>

            {!loadingLib && libControls.length === 0 && (
              <p className="text-xs text-gray-400 italic pl-1">No matching controls found in library for this threat.</p>
            )}

            {!loadingLib && libControls.length > 0 && (
              <div className="space-y-2">
                {libControls.map(ctrl => (
                  <label key={ctrl.control_id}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition border-2 ${
                      selected.has(ctrl.control_id)
                        ? "bg-amber-50 border-amber-300"
                        : "bg-white border-amber-100 hover:border-amber-300"
                    }`}>
                    <input type="checkbox"
                      checked={selected.has(ctrl.control_id)}
                      onChange={() => toggle(ctrl.control_id)}
                      className="mt-1 accent-amber-600 shrink-0 w-4 h-4" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">
                          {ctrl.control_id} — {ctrl.control_name}
                        </p>
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                          {ctrl.domain}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{ctrl.control_description}</p>
                      {ctrl.related_threat && (
                        <p className="text-xs text-amber-600 mt-1">
                          🎯 Related threats: {ctrl.related_threat}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* ── Full ISO control library (static) ─────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm font-semibold text-gray-700">
                ISO 27001:2022 Annex A — All Controls for {assessment.asset_type}
                <span className="ml-2 text-xs text-gray-400 font-normal">({isoRecommended.length} available)</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setSelected(new Set(isoRecommended.map(c => c.id))); setSaved(false); }}
                  className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition">
                  Select All
                </button>
                <button onClick={() => { setSelected(new Set()); setSaved(false); }}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition">
                  Clear
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    filter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 border border-gray-300 hover:border-blue-400"
                  }`}>
                  {cat === "All" ? "All" : `${cat} — ${CATEGORY_NAMES[cat]?.split(" ")[0]}`}
                </button>
              ))}
            </div>

            {loadingMap ? (
              <p className="text-sm text-gray-400 py-4 text-center animate-pulse">Loading saved controls…</p>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {Object.entries(groupedFiltered).map(([cat, controls]) => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{cat}</span>
                      <span className="text-xs text-gray-500">{CATEGORY_NAMES[cat]}</span>
                    </div>
                    <div className="space-y-1.5">
                      {controls.map(ctrl => {
                        const isInLib = libControlIds.has(ctrl.id);
                        return (
                          <label key={ctrl.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border ${
                              selected.has(ctrl.id)
                                ? isInLib ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-300"
                                : "bg-white border-gray-200 hover:border-blue-200"
                            }`}>
                            <input type="checkbox"
                              checked={selected.has(ctrl.id)}
                              onChange={() => toggle(ctrl.id)}
                              className="mt-0.5 accent-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{ctrl.id} — {ctrl.name}</p>
                                {isInLib && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                    ⭐ In Library
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{ctrl.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>{selected.size} / {isoRecommended.length} controls selected</p>
              {libControls.length > 0 && (
                <p className="text-xs text-amber-600">
                  {libControls.filter(c => selected.has(c.control_id)).length} / {libControls.length} suggested controls applied
                </p>
              )}
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {saving ? "Saving…" : saved ? "✅ Saved!" : "💾 Save Controls"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
