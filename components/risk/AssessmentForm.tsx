"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RangeSlider from "./RangeSlider";
import { LIKELIHOOD_LABELS, IMPACT_LABELS, calcInherentRisk, getRiskLevel, RISK_COLORS, calcAssetValue } from "@/lib/risk-utils";

interface Asset {
  id: number;
  name: string;
  type: string;
  confidentiality: number;
  integrity: number;
  availability: number;
  asset_value: number;
}

interface AssessmentFormProps {
  assets: Asset[];
  preselectedAssetId?: number;
  onSuccess?: () => void;
}

export default function AssessmentForm({ assets, preselectedAssetId, onSuccess }: AssessmentFormProps) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(preselectedAssetId ?? assets[0]?.id ?? 0);
  const [threatName, setThreatName] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ inherentRisk: number; riskLevel: string } | null>(null);

  const selectedAsset = assets.find(a => a.id === Number(assetId));
  const assetValue = selectedAsset?.asset_value ?? 3;
  const inherentRisk = calcInherentRisk(likelihood, impact, assetValue);
  const riskLevel = getRiskLevel(inherentRisk);
  const colors = RISK_COLORS[riskLevel];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/risk/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, threatName, likelihood, impact, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResult({ inherentRisk: data.inherentRisk, riskLevel: data.riskLevel });
      setThreatName(""); setNotes(""); setLikelihood(3); setImpact(3);
      router.refresh();
      onSuccess?.();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset + Threat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">สินทรัพย์ (Asset) *</label>
          <select value={assetId} onChange={e => setAssetId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
          </select>
          {selectedAsset && (
            <p className="text-xs text-gray-500 mt-1">Asset Value: <strong>{selectedAsset.asset_value.toFixed(2)}</strong> (C:{selectedAsset.confidentiality} I:{selectedAsset.integrity} A:{selectedAsset.availability})</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อภัยคุกคาม (Threat Name) *</label>
          <input value={threatName} onChange={e => setThreatName(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. SQL Injection, Ransomware, Phishing" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (Notes)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Additional context about this threat…" />
      </div>

      {/* Sliders + Live Calculation */}
      <div className={`rounded-xl p-5 space-y-5 border-2 transition-colors ${colors.bg} border-opacity-50`}
        style={{ borderColor: colors.hex + "66" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Risk Calculation</h3>
            <p className="text-xs text-gray-500 mt-0.5">สูตร: Inherent Risk = Likelihood × Impact × Asset Value</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black" style={{ color: colors.hex }}>{inherentRisk.toFixed(1)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>{riskLevel}</span>
            <p className="text-xs text-gray-400 mt-1">{likelihood} × {impact} × {assetValue.toFixed(2)}</p>
          </div>
        </div>

        <RangeSlider label="⚠️ Likelihood — โอกาสเกิด" value={likelihood} onChange={setLikelihood} valueLabelMap={LIKELIHOOD_LABELS} color="orange" />
        <RangeSlider label="💥 Impact — ผลกระทบ" value={impact} onChange={setImpact} valueLabelMap={IMPACT_LABELS} color="blue" />

        {/* Visual risk bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>0 (Low)</span><span>25</span><span>75</span><span>125 (Max)</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 h-full" style={{ width: "20%", background: "#86efac" }} />
            <div className="absolute inset-y-0 h-full" style={{ left: "20%", width: "40%", background: "#fdba74" }} />
            <div className="absolute inset-y-0 h-full" style={{ left: "60%", width: "40%", background: "#fca5a5" }} />
            <div className="absolute inset-y-0 w-1 rounded-full bg-gray-900 transition-all"
              style={{ left: `${Math.min((inherentRisk / 125) * 100, 99)}%` }} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${RISK_COLORS[result.riskLevel as keyof typeof RISK_COLORS]?.badge}`}>
          ✅ Assessment saved — Risk Score: {result.inherentRisk.toFixed(1)} ({result.riskLevel})
          {(result.riskLevel === "Critical" || result.riskLevel === "Medium") && (
            <a href="/risk-assessment/controls" className="ml-3 underline font-semibold">→ Map Controls</a>
          )}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition text-sm">
        {loading ? "Saving…" : "Save Assessment →"}
      </button>
    </form>
  );
}
