import React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary:  "#1e3a5f",
  accent:   "#2563eb",
  critical: "#dc2626",
  medium:   "#ea580c",
  low:      "#16a34a",
  g50:      "#f9fafb",
  g100:     "#f3f4f6",
  g200:     "#e5e7eb",
  g400:     "#9ca3af",
  g600:     "#4b5563",
  g800:     "#1f2937",
  white:    "#ffffff",
  yellow:   "#d97706",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Cover
  cover: {
    backgroundColor: C.primary,
    padding: 60,
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  coverLogo: { fontSize: 11, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase" },
  coverTitle: { fontSize: 32, color: C.white, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  coverSub: { fontSize: 14, color: "#93c5fd", marginTop: 8 },
  coverMeta: { fontSize: 10, color: "#60a5fa" },
  coverFooter: { fontSize: 9, color: "#475569", borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 12 },

  // Content pages
  page: {
    paddingTop: 65,
    paddingBottom: 55,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.g800,
  },
  // Fixed header
  header: {
    position: "absolute",
    top: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.g200,
    paddingBottom: 6,
  },
  headerOrg: { fontSize: 8, color: C.g400, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerTitle: { fontSize: 8, color: C.g400 },
  // Fixed footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.g200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.g400 },
  pageNumber: { fontSize: 7, color: C.g400 },

  // Section headings
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.primary, marginBottom: 14 },
  sectionDesc: { fontSize: 9, color: C.g600, marginBottom: 16 },

  // Stat cards row
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 6, padding: 12,
    backgroundColor: C.g50, borderWidth: 1, borderColor: C.g200,
  },
  statLabel: { fontSize: 8, color: C.g600, marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.primary },
  statSub: { fontSize: 7, color: C.g400, marginTop: 2 },

  // Badge chip
  badgeCritical: { backgroundColor: "#fee2e2", color: "#991b1b", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontFamily: "Helvetica-Bold" },
  badgeMedium:   { backgroundColor: "#ffedd5", color: "#9a3412", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontFamily: "Helvetica-Bold" },
  badgeLow:      { backgroundColor: "#dcfce7", color: "#166534", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontFamily: "Helvetica-Bold" },

  // Table
  tableHeader: {
    flexDirection: "row", backgroundColor: C.primary,
    paddingVertical: 6, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.g100,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: C.g50,
    borderBottomWidth: 1, borderBottomColor: C.g100,
  },
  tableRowCritical: {
    flexDirection: "row",
    paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: "#fff1f2",
    borderBottomWidth: 1, borderBottomColor: "#fee2e2",
    borderLeftWidth: 3, borderLeftColor: C.critical,
  },
  thCell: { fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold" },
  tdCell: { fontSize: 8, color: C.g800 },

  // Matrix
  matrixContainer: { flexDirection: "column", alignItems: "center", marginTop: 10 },
  matrixRow: { flexDirection: "row" },
  matrixAxisLabel: { fontSize: 7, color: C.g600, textAlign: "center" },
  matrixYLabel: { fontSize: 7, color: C.g600, textAlign: "right", paddingRight: 6, paddingTop: 12 },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RiskRow {
  id: number;
  asset_name: string;
  threat_name: string;
  likelihood: number;
  impact: number;
  inherent_risk: number;
  risk_level: string;
  controls_count: number;
  treatment_status: string | null;
}

export interface RiskRegisterData {
  orgName: string;
  generatedAt: string;
  stats: {
    totalAssets: number;
    critical: number;
    medium: number;
    low: number;
    avgCompliance: number;
    totalAssessments: number;
  };
  risks: RiskRow[];
  matrixPoints: Array<{ likelihood: number; impact: number; count: number }>;
}

// ── Helper: matrix cell color ─────────────────────────────────────────────────
function cellBg(l: number, i: number): string {
  const s = l * i;
  if (s >= 15) return C.critical;
  if (s >= 10) return "#f97316";
  if (s >= 5)  return "#fbbf24";
  return "#4ade80";
}
function cellFg(l: number, i: number): string {
  return l * i >= 5 ? C.white : C.g800;
}
function cellLabel(l: number, i: number): string {
  const s = l * i;
  if (s >= 15) return "Critical";
  if (s >= 10) return "High";
  if (s >= 5)  return "Med";
  return "Low";
}

// ── Level badge style selector ────────────────────────────────────────────────
function levelStyle(level: string) {
  if (level === "Critical") return S.badgeCritical;
  if (level === "Medium")   return S.badgeMedium;
  return S.badgeLow;
}
function levelColor(level: string): string {
  if (level === "Critical") return C.critical;
  if (level === "Medium")   return C.medium;
  return C.low;
}

// ── PDF Document ──────────────────────────────────────────────────────────────
export function RiskRegisterPDF({ data }: { data: RiskRegisterData }) {
  const { orgName, generatedAt, stats, risks, matrixPoints } = data;

  // Build matrix lookup: [likelihood][impact] => count
  const mLookup: Record<string, number> = {};
  for (const p of matrixPoints) {
    mLookup[`${p.likelihood}:${p.impact}`] = p.count;
  }

  // Header / footer components (fixed on every content page)
  const Header = () => (
    <View style={S.header} fixed>
      <Text style={S.headerOrg}>{orgName} — Risk Register Report</Text>
      <Text style={S.headerTitle}>Generated: {generatedAt}</Text>
    </View>
  );
  const Footer = () => (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>Generated by ME Corporation GRC Platform | Confidential</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Risk Register — ${orgName}`} author="ME Corporation GRC Platform">

      {/* ── COVER ──────────────────────────────────────────────────────────── */}
      <Page size="A4">
        <View style={S.cover}>
          <View>
            <Text style={S.coverLogo}>{orgName}</Text>
            <View style={{ marginTop: 80 }}>
              <Text style={S.coverTitle}>Risk Register{"\n"}Report</Text>
              <Text style={S.coverSub}>ISO 27001:2022 Risk Assessment</Text>
            </View>
          </View>
          <View>
            <Text style={S.coverMeta}>Report Date: {generatedAt}</Text>
            <Text style={[S.coverMeta, { marginTop: 4 }]}>
              Total Assessments: {stats.totalAssessments} risks across {stats.totalAssets} assets
            </Text>
            <View style={{ marginTop: 40 }}>
              <Text style={S.coverFooter}>
                CONFIDENTIAL — This document is intended solely for authorised personnel of {orgName}.
                Any reproduction or distribution without prior written consent is strictly prohibited.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── EXECUTIVE SUMMARY ─────────────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Executive Summary</Text>
        <Text style={S.sectionDesc}>
          High-level overview of the organization&apos;s risk posture as of {generatedAt}.
        </Text>

        {/* KPI Stats */}
        <View style={S.statsRow}>
          <View style={S.statCard}>
            <Text style={S.statLabel}>Total Assets</Text>
            <Text style={[S.statValue, { color: C.accent }]}>{stats.totalAssets}</Text>
            <Text style={S.statSub}>registered assets</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statLabel}>Total Risks</Text>
            <Text style={[S.statValue, { color: C.g800 }]}>{stats.totalAssessments}</Text>
            <Text style={S.statSub}>assessed risks</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statLabel}>Compliance Score</Text>
            <Text style={[S.statValue, { color: stats.avgCompliance >= 70 ? C.low : stats.avgCompliance >= 40 ? C.yellow : C.critical }]}>
              {stats.avgCompliance}%
            </Text>
            <Text style={S.statSub}>ISO 27001:2022 Annex A</Text>
          </View>
        </View>

        {/* Risk Level Breakdown */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.g800, marginBottom: 10 }}>
            Risk Level Distribution
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { label: "Critical", val: stats.critical, bg: "#fef2f2", border: "#fecaca", text: C.critical },
              { label: "Medium",   val: stats.medium,   bg: "#fff7ed", border: "#fed7aa", text: C.medium },
              { label: "Low",      val: stats.low,      bg: "#f0fdf4", border: "#bbf7d0", text: C.low },
            ].map(({ label, val, bg, border, text }) => (
              <View key={label} style={{
                flex: 1, backgroundColor: bg, borderWidth: 1, borderColor: border,
                borderRadius: 6, padding: 14, alignItems: "center",
              }}>
                <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: text }}>{val}</Text>
                <Text style={{ fontSize: 9, color: text, marginTop: 4, fontFamily: "Helvetica-Bold" }}>{label}</Text>
                <Text style={{ fontSize: 8, color: C.g400, marginTop: 2 }}>
                  {stats.totalAssessments > 0 ? Math.round((val / stats.totalAssessments) * 100) : 0}% of total
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick findings */}
        <View style={{ backgroundColor: C.g50, borderRadius: 6, padding: 14, borderWidth: 1, borderColor: C.g200 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: C.g800, marginBottom: 8 }}>
            Key Findings
          </Text>
          {[
            stats.critical > 0
              ? `⚠  ${stats.critical} Critical risk(s) require immediate treatment actions.`
              : "✓  No critical risks identified at this time.",
            `•  ${stats.medium} risk(s) at Medium level — treatment plan recommended within 30 days.`,
            `•  ${stats.low} risk(s) at Low level — monitor and review periodically.`,
            `•  ISO 27001:2022 compliance score: ${stats.avgCompliance}% (${
              stats.avgCompliance >= 70 ? "Adequate" : stats.avgCompliance >= 40 ? "Needs Improvement" : "Critical Gap"
            }).`,
          ].map((line, i) => (
            <Text key={i} style={{ fontSize: 9, color: C.g600, marginBottom: 4, lineHeight: 1.5 }}>{line}</Text>
          ))}
        </View>
      </Page>

      {/* ── RISK MATRIX ───────────────────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>5×5 Risk Matrix</Text>
        <Text style={S.sectionDesc}>
          Risk distribution by Likelihood (vertical) vs Impact (horizontal). Numbers indicate risk count at each position.
        </Text>

        {/* Impact axis labels */}
        <View style={{ flexDirection: "row", marginLeft: 60, marginBottom: 2 }}>
          <Text style={{ fontSize: 9, color: C.g600, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            ← Impact →
          </Text>
        </View>
        <View style={{ flexDirection: "row", marginLeft: 60, marginBottom: 4 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={{ width: 70, alignItems: "center" }}>
              <Text style={S.matrixAxisLabel}>{i}</Text>
            </View>
          ))}
        </View>

        {/* Matrix rows */}
        {[5, 4, 3, 2, 1].map(l => (
          <View key={l} style={[S.matrixRow, { marginBottom: 2 }]}>
            {/* Y axis label */}
            <View style={{ width: 58, justifyContent: "center" }}>
              <Text style={{ fontSize: 7, color: C.g600, textAlign: "right", paddingRight: 8 }}>L={l}</Text>
            </View>
            {[1, 2, 3, 4, 5].map(i => {
              const count = mLookup[`${l}:${i}`] ?? 0;
              return (
                <View key={i} style={{
                  width: 70, height: 44,
                  backgroundColor: cellBg(l, i),
                  justifyContent: "center", alignItems: "center",
                  borderWidth: 1, borderColor: C.white,
                  borderRadius: 3,
                }}>
                  <Text style={{ fontSize: 8, color: cellFg(l, i), fontFamily: "Helvetica-Bold" }}>
                    {l * i}
                  </Text>
                  <Text style={{ fontSize: 6, color: cellFg(l, i), marginTop: 1 }}>
                    {cellLabel(l, i)}
                  </Text>
                  {count > 0 && (
                    <View style={{
                      backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 6,
                      paddingHorizontal: 4, paddingVertical: 1, marginTop: 2,
                    }}>
                      <Text style={{ fontSize: 6, color: C.white, fontFamily: "Helvetica-Bold" }}>
                        {count} risk{count > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          {[
            { bg: C.critical, label: "Critical (L×I ≥ 15)" },
            { bg: "#f97316",  label: "High (10–14)" },
            { bg: "#fbbf24",  label: "Medium (5–9)" },
            { bg: "#4ade80",  label: "Low (< 5)" },
          ].map(({ bg, label }) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 12, height: 12, backgroundColor: bg, borderRadius: 2 }} />
              <Text style={{ fontSize: 8, color: C.g600 }}>{label}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── RISK TABLE ────────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={[S.page, { paddingTop: 65 }]}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Full Risk Register</Text>

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={[S.thCell, { width: 120 }]}>Asset</Text>
          <Text style={[S.thCell, { flex: 1 }]}>Threat / Risk Name</Text>
          <Text style={[S.thCell, { width: 30, textAlign: "center" }]}>L</Text>
          <Text style={[S.thCell, { width: 30, textAlign: "center" }]}>I</Text>
          <Text style={[S.thCell, { width: 55, textAlign: "center" }]}>Score</Text>
          <Text style={[S.thCell, { width: 60, textAlign: "center" }]}>Level</Text>
          <Text style={[S.thCell, { width: 70, textAlign: "center" }]}>Treatment</Text>
          <Text style={[S.thCell, { width: 40, textAlign: "center" }]}>Controls</Text>
        </View>

        {risks.map((r, idx) => {
          const isCrit = r.risk_level === "Critical";
          const rowStyle = isCrit ? S.tableRowCritical : idx % 2 === 0 ? S.tableRow : S.tableRowAlt;
          return (
            <View key={r.id} style={rowStyle} wrap={false}>
              <Text style={[S.tdCell, { width: 120 }]}>{r.asset_name}</Text>
              <Text style={[S.tdCell, { flex: 1, paddingRight: 6 }]}>{r.threat_name}</Text>
              <Text style={[S.tdCell, { width: 30, textAlign: "center" }]}>{r.likelihood}</Text>
              <Text style={[S.tdCell, { width: 30, textAlign: "center" }]}>{r.impact}</Text>
              <Text style={[S.tdCell, { width: 55, textAlign: "center", fontFamily: "Helvetica-Bold", color: levelColor(r.risk_level) }]}>
                {Number(r.inherent_risk).toFixed(1)}
              </Text>
              <View style={{ width: 60, alignItems: "center", justifyContent: "center" }}>
                <Text style={levelStyle(r.risk_level)}>{r.risk_level}</Text>
              </View>
              <Text style={[S.tdCell, { width: 70, textAlign: "center", color: r.treatment_status ? C.low : C.g400 }]}>
                {r.treatment_status ?? "—"}
              </Text>
              <Text style={[S.tdCell, { width: 40, textAlign: "center" }]}>{r.controls_count}</Text>
            </View>
          );
        })}

        {risks.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: C.g400 }}>No risk assessments found.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
