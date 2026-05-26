export const BIA_IMPACT_LABELS: Record<number, string> = {
  1: "Negligible",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Critical",
};

export const PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_COLORS: Record<PriorityLevel, { bg: string; text: string; badge: string; hex: string }> = {
  Critical: { bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-100 text-red-700 border border-red-300",    hex: "#dc2626" },
  High:     { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700 border border-orange-300", hex: "#ea580c" },
  Medium:   { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700 border border-yellow-300", hex: "#ca8a04" },
  Low:      { bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-100 text-green-700 border border-green-300",  hex: "#16a34a" },
};

export function calcMaxTimeImpact(
  impact_1h: number,
  impact_4h: number,
  impact_24h: number,
  impact_7d: number,
): number {
  return Math.max(impact_1h, impact_4h, impact_24h, impact_7d);
}

export function calcRTO(maxImpact: number): number {
  if (maxImpact >= 4) return 4;
  if (maxImpact >= 3) return 24;
  return 72;
}

export function calcRPO(maxImpact: number): number {
  if (maxImpact >= 4) return 1;
  if (maxImpact >= 3) return 4;
  return 24;
}

export function calcPriority(maxImpact: number): PriorityLevel {
  if (maxImpact >= 4) return "Critical";
  if (maxImpact >= 3) return "High";
  if (maxImpact >= 2) return "Medium";
  return "Low";
}

/** Format hours for display: 1h / 4h / 1d / 3d */
export function fmtHours(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 24)  return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Score → Tailwind bg color class for heatmap cells */
export function impactBgClass(score: number): string {
  if (score >= 5) return "bg-red-500 text-white";
  if (score >= 4) return "bg-orange-400 text-white";
  if (score >= 3) return "bg-yellow-300 text-gray-900";
  if (score >= 2) return "bg-green-200 text-gray-900";
  return "bg-gray-100 text-gray-500";
}
