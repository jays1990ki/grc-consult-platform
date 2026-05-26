import Link from "next/link";
import { Shield, Database, Activity, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    step: 1,
    href: "/risk-assessment/assets",
    icon: Database,
    title: "ลงทะเบียนสินทรัพย์",
    subtitle: "Asset Registration",
    desc: "ระบุสินทรัพย์และประเมินค่า CIA Triad (Confidentiality, Integrity, Availability)",
    color: "blue",
  },
  {
    step: 2,
    href: "/risk-assessment/assess",
    icon: Activity,
    title: "ประเมินความเสี่ยง",
    subtitle: "Risk Assessment",
    desc: "กำหนดภัยคุกคาม คะแนน Likelihood และ Impact แล้วระบบคำนวณ Inherent Risk อัตโนมัติ",
    color: "orange",
  },
  {
    step: 3,
    href: "/risk-assessment/controls",
    icon: Shield,
    title: "จับคู่มาตรการควบคุม",
    subtitle: "Control Mapping",
    desc: "ระบบแนะนำมาตรการ ISO 27001:2022 Annex A สำหรับความเสี่ยงระดับ Critical และ Medium",
    color: "red",
  },
  {
    step: 4,
    href: "/risk-assessment/executive",
    icon: BarChart3,
    title: "แดชบอร์ดผู้บริหาร",
    subtitle: "Executive Dashboard",
    desc: "Risk Matrix 5×5 สรุปจำนวนความเสี่ยง และ Radar Chart แสดงคะแนน Compliance Score",
    color: "green",
  },
];

const colorMap: Record<string, { border: string; icon: string; badge: string }> = {
  blue:   { border: "border-blue-200 hover:border-blue-400",   icon: "bg-blue-100 text-blue-700",   badge: "bg-blue-50 text-blue-700" },
  orange: { border: "border-orange-200 hover:border-orange-400", icon: "bg-orange-100 text-orange-700", badge: "bg-orange-50 text-orange-700" },
  red:    { border: "border-red-200 hover:border-red-400",     icon: "bg-red-100 text-red-700",     badge: "bg-red-50 text-red-700" },
  green:  { border: "border-green-200 hover:border-green-400", icon: "bg-green-100 text-green-700", badge: "bg-green-50 text-green-700" },
};

export default function RiskAssessmentHome() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Assessment Module</h1>
          <p className="text-gray-500 mt-1">แพลตฟอร์มประเมินความเสี่ยงอัตโนมัติตามมาตรฐาน ISO 27001:2022</p>
        </div>
      </div>

      {/* Workflow steps */}
      <div className="relative">
        <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gray-200 mx-16" style={{ top: "2.5rem" }} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {STEPS.map(({ step, href, icon: Icon, title, subtitle, desc, color }) => {
            const c = colorMap[color];
            return (
              <Link key={step} href={href} className={`bg-white border-2 ${c.border} rounded-xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-md relative`}>
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{step}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Formula box */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Risk Calculation Formula</p>
        <div className="flex flex-wrap items-center gap-3 text-lg font-bold">
          <span className="bg-white bg-opacity-20 px-4 py-2 rounded-xl">Inherent Risk</span>
          <span className="text-blue-200">=</span>
          <span className="bg-orange-400 bg-opacity-80 px-4 py-2 rounded-xl">Likelihood (1–5)</span>
          <span className="text-blue-200">×</span>
          <span className="bg-purple-400 bg-opacity-80 px-4 py-2 rounded-xl">Impact (1–5)</span>
          <span className="text-blue-200">×</span>
          <span className="bg-green-400 bg-opacity-80 px-4 py-2 rounded-xl">Asset Value (avg CIA)</span>
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          {[
            { label: "Low",      range: "< 25",   color: "text-green-300" },
            { label: "Medium",   range: "25–74",  color: "text-yellow-300" },
            { label: "Critical", range: "≥ 75",   color: "text-red-300" },
          ].map(({ label, range, color }) => (
            <div key={label} className={`flex items-center gap-1.5 ${color}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              <span className="font-semibold">{label}</span>
              <span className="text-xs opacity-80">({range})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
