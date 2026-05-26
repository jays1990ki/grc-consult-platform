export const CIA_LABELS: Record<number, string> = {
  1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High",
};
export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Almost Certain",
};
export const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical",
};

export function calcAssetValue(c: number, i: number, a: number): number {
  return Math.round(((c + i + a) / 3) * 100) / 100;
}

export function calcInherentRisk(likelihood: number, impact: number, assetValue: number): number {
  return Math.round(likelihood * impact * assetValue * 100) / 100;
}

export type RiskLevel = "Critical" | "Medium" | "Low";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "Critical";
  if (score >= 25) return "Medium";
  return "Low";
}

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; badge: string; hex: string }> = {
  Critical: { bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-100 text-red-700 border border-red-300",    hex: "#ef4444" },
  Medium:   { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700 border border-orange-300", hex: "#f97316" },
  Low:      { bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-100 text-green-700 border border-green-300",  hex: "#22c55e" },
};

// For the risk matrix heatmap (L×I, no asset value)
export function matrixCellColor(l: number, i: number): string {
  const score = l * i;
  if (score >= 15) return "bg-red-400";
  if (score >= 10) return "bg-orange-400";
  if (score >= 5)  return "bg-yellow-300";
  return "bg-green-300";
}

export function matrixCellTextColor(l: number, i: number): string {
  const score = l * i;
  if (score >= 10) return "text-white";
  return "text-gray-800";
}
