// Client-safe: no next/headers, no server-only imports

export interface ModulePermission {
  canAccess: boolean;
  canEdit: boolean;
}

export type PortalPermissions = Record<string, ModulePermission>;

export const PORTAL_MODULES = [
  {
    id: "assets",
    label: "Asset Registration",
    labelTh: "ลงทะเบียนสินทรัพย์",
    desc: "ลงทะเบียนสินทรัพย์และประเมินค่า CIA Triad",
    icon: "🗄️",
    href: "/portal/assets",
    color: "blue",
  },
  {
    id: "assess",
    label: "Risk Assessment",
    labelTh: "ประเมินความเสี่ยง",
    desc: "กำหนดภัยคุกคาม คำนวณ Inherent Risk พร้อม Heatmap",
    icon: "⚖️",
    href: "/portal/assess",
    color: "orange",
  },
  {
    id: "controls",
    label: "Control Mapping",
    labelTh: "จับคู่มาตรการควบคุม",
    desc: "แนะนำและเลือกมาตรการ ISO 27001:2022 Annex A",
    icon: "🛡️",
    href: "/portal/controls",
    color: "red",
  },
  {
    id: "executive",
    label: "Executive Dashboard",
    labelTh: "แดชบอร์ดสรุปผล",
    desc: "Risk Matrix 5×5 และ Compliance Radar Chart",
    icon: "📊",
    href: "/portal/executive",
    color: "green",
  },
] as const;
