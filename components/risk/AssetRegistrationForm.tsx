"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RangeSlider from "./RangeSlider";
import { CIA_LABELS, calcAssetValue } from "@/lib/risk-utils";

const ASSET_TYPES = ["Hardware", "Software", "Data", "People"];

const TYPE_ICONS: Record<string, string> = {
  Hardware: "🖥️", Software: "⚙️", Data: "🗄️", People: "👥",
};

export default function AssetRegistrationForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("Data");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [c, setC] = useState(3);
  const [i, setI] = useState(3);
  const [a, setA] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const assetValue = calcAssetValue(c, i, a);

  const avColor = assetValue >= 4 ? "text-red-600" : assetValue >= 3 ? "text-orange-500" : "text-green-600";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/risk/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, confidentiality: c, integrity: i, availability: a, description, owner }),
      });
      if (!res.ok) { setError((await res.json()).error); return; }
      setSuccess("Asset registered successfully!");
      setName(""); setOwner(""); setDescription(""); setC(3); setI(3); setA(3);
      router.refresh();
      onSuccess?.();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินทรัพย์ (Asset Name) *</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Core Banking Database" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทสินทรัพย์ (Asset Type) *</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            {ASSET_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เจ้าของสินทรัพย์ (Asset Owner)</label>
          <input value={owner} onChange={e => setOwner(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. IT Department" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย (Description)</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Brief description of this asset" />
        </div>
      </div>

      {/* CIA Sliders */}
      <div className="bg-blue-50 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">CIA Triad Assessment</h3>
            <p className="text-xs text-gray-500 mt-0.5">ประเมินความสำคัญของสินทรัพย์ตามหลัก CIA (1 = Very Low, 5 = Very High)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Asset Value (AV)</p>
            <p className={`text-2xl font-bold ${avColor}`}>{assetValue.toFixed(2)}</p>
            <p className="text-xs text-gray-400">avg(C+I+A) / 3</p>
          </div>
        </div>

        <RangeSlider label="🔒 Confidentiality (การรักษาความลับ)" value={c} onChange={setC} valueLabelMap={CIA_LABELS} color="blue" />
        <RangeSlider label="✅ Integrity (ความถูกต้องครบถ้วน)" value={i} onChange={setI} valueLabelMap={CIA_LABELS} color="purple" />
        <RangeSlider label="⚡ Availability (ความพร้อมใช้งาน)" value={a} onChange={setA} valueLabelMap={CIA_LABELS} color="orange" />

        {/* CIA Bar Visual */}
        <div className="flex gap-2 pt-2">
          {[{ label: "C", val: c, color: "bg-blue-500" }, { label: "I", val: i, color: "bg-purple-500" }, { label: "A", val: a, color: "bg-orange-500" }].map(({ label, val, color }) => (
            <div key={label} className="flex-1 space-y-1">
              <div className="bg-gray-200 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${val * 20}%` }} />
              </div>
              <p className="text-xs text-center text-gray-500">{label}: {val}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">{success}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition text-sm">
        {loading ? "Registering…" : "Register Asset →"}
      </button>
    </form>
  );
}
