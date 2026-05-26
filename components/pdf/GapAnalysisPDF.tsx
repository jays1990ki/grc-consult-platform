import React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary:  "#1e3a5f",
  accent:   "#7c3aed",      // purple for GAP theme
  compliant: "#15803d",
  partial:   "#b45309",
  noncomp:   "#b91c1c",
  na:        "#6b7280",
  g50:  "#f9fafb",
  g100: "#f3f4f6",
  g200: "#e5e7eb",
  g400: "#9ca3af",
  g600: "#4b5563",
  g800: "#1f2937",
  white: "#ffffff",
};

const S = StyleSheet.create({
  // Cover
  cover: {
    backgroundColor: C.accent,
    padding: 60,
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  coverOrg:   { fontSize: 10, color: "#c4b5fd", letterSpacing: 2 },
  coverTitle: { fontSize: 30, color: C.white, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  coverSub:   { fontSize: 13, color: "#c4b5fd", marginTop: 8 },
  coverMeta:  { fontSize: 10, color: "#a78bfa" },
  coverFooter: { fontSize: 9, color: "#6d28d9", borderTopWidth: 1, borderTopColor: "#5b21b6", paddingTop: 12 },

  page: {
    paddingTop: 65,
    paddingBottom: 55,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.g800,
  },
  header: {
    position: "absolute", top: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: C.g200, paddingBottom: 6,
  },
  headerOrg:   { fontSize: 8, color: C.g400, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerTitle: { fontSize: 8, color: C.g400 },
  footer: {
    position: "absolute", bottom: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: C.g200, paddingTop: 6,
  },
  footerText:  { fontSize: 7, color: C.g400 },
  pageNumber:  { fontSize: 7, color: C.g400 },

  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 14 },
  sectionDesc:  { fontSize: 9, color: C.g600, marginBottom: 16 },

  // Score ring (we'll fake it with a large text display)
  scoreBox: {
    backgroundColor: "#f5f3ff", borderRadius: 8, padding: 20,
    alignItems: "center", borderWidth: 2, borderColor: "#ddd6fe",
  },
  scorePct: { fontSize: 56, fontFamily: "Helvetica-Bold" },
  scoreLabel: { fontSize: 11, color: C.g600, marginTop: 4 },

  // Domain table
  th: {
    backgroundColor: C.accent, paddingVertical: 6, paddingHorizontal: 8,
  },
  thText: { fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold" },
  tr: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.g100,
  },
  trAlt: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: C.g50,
    borderBottomWidth: 1, borderBottomColor: C.g100,
  },
  trNonComp: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: "#fff1f2",
    borderBottomWidth: 1, borderBottomColor: "#fee2e2",
    borderLeftWidth: 3, borderLeftColor: C.noncomp,
  },
  trPartial: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1, borderBottomColor: "#fde68a",
    borderLeftWidth: 3, borderLeftColor: C.partial,
  },
  td: { fontSize: 8, color: C.g800 },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GapRow {
  requirement_id:    string;
  requirement_name:  string;
  domain:            string;
  status:            string;
  comment:           string | null;
  responsible_person: string | null;
  gap_severity:      string | null;
  converted_to_risk: number;
}

export interface DomainStat {
  domain:   string;
  score:    number;
  assessed: number;
  total:    number;
}

export interface GapAnalysisData {
  orgName:       string;
  frameworkName: string;
  assessmentDate: string;
  generatedAt:   string;
  overallScore:  number;
  domainStats:   DomainStat[];
  rows:          GapRow[];
  counts: {
    compliant: number;
    partial:   number;
    nonComp:   number;
    na:        number;
    total:     number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(pct: number): string {
  if (pct >= 80) return C.compliant;
  if (pct >= 50) return C.partial;
  return C.noncomp;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function statusBadgeStyle(status: string): any {
  const base = { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 7, fontFamily: "Helvetica-Bold" };
  if (status === "Compliant")           return { ...base, backgroundColor: "#dcfce7", color: "#166534" };
  if (status === "Partially Compliant") return { ...base, backgroundColor: "#fef3c7", color: "#92400e" };
  if (status === "Non-Compliant")       return { ...base, backgroundColor: "#fee2e2", color: "#991b1b" };
  return { ...base, backgroundColor: C.g100, color: C.na };
}

function getRowStyle(status: string, idx: number) {
  if (status === "Non-Compliant")       return S.trNonComp;
  if (status === "Partially Compliant") return S.trPartial;
  return idx % 2 === 0 ? S.tr : S.trAlt;
}

// ── PDF Document ──────────────────────────────────────────────────────────────
export function GapAnalysisPDF({ data }: { data: GapAnalysisData }) {
  const { orgName, frameworkName, assessmentDate, generatedAt, overallScore, domainStats, rows, counts } = data;

  const Header = () => (
    <View style={S.header} fixed>
      <Text style={S.headerOrg}>{orgName} — GAP Analysis Report</Text>
      <Text style={S.headerTitle}>{frameworkName} | {generatedAt}</Text>
    </View>
  );
  const Footer = () => (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>Generated by ME Corporation GRC Platform | Confidential</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );

  const readinessLabel =
    overallScore >= 80 ? "High Readiness" :
    overallScore >= 50 ? "Moderate Readiness" :
    "Low Readiness — Action Required";

  return (
    <Document title={`GAP Analysis — ${frameworkName}`} author="ME Corporation GRC Platform">

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <Page size="A4">
        <View style={S.cover}>
          <View>
            <Text style={S.coverOrg}>{orgName}</Text>
            <View style={{ marginTop: 80 }}>
              <Text style={S.coverTitle}>GAP Analysis{"\n"}Report</Text>
              <Text style={S.coverSub}>{frameworkName}</Text>
            </View>
          </View>
          <View>
            <Text style={S.coverMeta}>Assessment Date: {assessmentDate}</Text>
            <Text style={[S.coverMeta, { marginTop: 4 }]}>Generated: {generatedAt}</Text>
            <Text style={[S.coverMeta, { marginTop: 4 }]}>
              {counts.total} requirements assessed · Overall Readiness: {overallScore}%
            </Text>
            <View style={{ marginTop: 40 }}>
              <Text style={S.coverFooter}>
                CONFIDENTIAL — For internal use only. Property of {orgName}.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── OVERALL SCORE + DOMAIN BREAKDOWN ─────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Overall Readiness Score</Text>

        {/* Big score display */}
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
          <View style={[S.scoreBox, { flex: 1 }]}>
            <Text style={[S.scorePct, { color: scoreColor(overallScore) }]}>{overallScore}%</Text>
            <Text style={S.scoreLabel}>{readinessLabel}</Text>
            <Text style={{ fontSize: 9, color: C.g400, marginTop: 6 }}>{frameworkName}</Text>
          </View>

          {/* Summary counts */}
          <View style={{ flex: 1, gap: 8 }}>
            {[
              { label: "Compliant",           val: counts.compliant, bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
              { label: "Partially Compliant", val: counts.partial,   bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
              { label: "Non-Compliant",       val: counts.nonComp,   bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
              { label: "Not Applicable",      val: counts.na,        bg: C.g100,   text: C.na,       border: C.g200 },
            ].map(({ label, val, bg, text, border }) => (
              <View key={label} style={{
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                backgroundColor: bg, borderWidth: 1, borderColor: border,
                borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 9, color: text, fontFamily: "Helvetica-Bold" }}>{label}</Text>
                <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: text }}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Domain Breakdown table */}
        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.g800, marginBottom: 10 }}>
          Readiness by Domain
        </Text>

        <View style={{ flexDirection: "row", backgroundColor: C.accent, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2 }}>
          <Text style={[S.thText, { flex: 1 }]}>Domain</Text>
          <Text style={[S.thText, { width: 70, textAlign: "center" }]}>Assessed</Text>
          <Text style={[S.thText, { width: 70, textAlign: "center" }]}>Score</Text>
          <Text style={[S.thText, { width: 100, textAlign: "center" }]}>Status</Text>
        </View>

        {domainStats.map((d, idx) => (
          <View key={d.domain} style={idx % 2 === 0 ? S.tr : S.trAlt}>
            <Text style={[S.td, { flex: 1 }]}>{d.domain}</Text>
            <Text style={[S.td, { width: 70, textAlign: "center" }]}>{d.assessed}/{d.total}</Text>
            <Text style={[S.td, { width: 70, textAlign: "center", fontFamily: "Helvetica-Bold", color: scoreColor(d.score) }]}>
              {d.assessed ? `${d.score}%` : "—"}
            </Text>
            <View style={{ width: 100, justifyContent: "center", alignItems: "center" }}>
              <Text style={{
                fontSize: 7, fontFamily: "Helvetica-Bold",
                color: d.score >= 80 ? "#166534" : d.score >= 50 ? "#92400e" : "#991b1b",
                backgroundColor: d.score >= 80 ? "#dcfce7" : d.score >= 50 ? "#fef3c7" : "#fee2e2",
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
              }}>
                {!d.assessed ? "Not Assessed" : d.score >= 80 ? "Adequate" : d.score >= 50 ? "Needs Work" : "Critical Gap"}
              </Text>
            </View>
          </View>
        ))}
      </Page>

      {/* ── FULL CHECKLIST ────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={[S.page, { paddingTop: 65 }]}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Full Compliance Checklist</Text>
        <Text style={[S.sectionDesc, { marginBottom: 10 }]}>
          Non-Compliant items are highlighted in red. Partially Compliant items in amber.
        </Text>

        {/* Table header */}
        <View style={{ flexDirection: "row", backgroundColor: C.accent, paddingVertical: 6, paddingHorizontal: 4 }}>
          <Text style={[S.thText, { width: 70 }]}>Req. ID</Text>
          <Text style={[S.thText, { width: 180 }]}>Requirement Name</Text>
          <Text style={[S.thText, { width: 90 }]}>Domain</Text>
          <Text style={[S.thText, { width: 100, textAlign: "center" }]}>Status</Text>
          <Text style={[S.thText, { width: 60, textAlign: "center" }]}>Severity</Text>
          <Text style={[S.thText, { flex: 1 }]}>Comment</Text>
          <Text style={[S.thText, { width: 90 }]}>Responsible</Text>
        </View>

        {rows.map((row, idx) => (
          <View key={`${row.requirement_id}-${idx}`} style={getRowStyle(row.status, idx)} wrap={false}>
            <Text style={[S.td, { width: 70, fontFamily: "Helvetica-Bold", color: C.accent }]}>
              {row.requirement_id}
            </Text>
            <Text style={[S.td, { width: 180, paddingRight: 4 }]}>
              {row.requirement_name}
            </Text>
            <Text style={[S.td, { width: 90 }]}>{row.domain}</Text>
            <View style={{ width: 100, justifyContent: "center", alignItems: "center" }}>
              <Text style={statusBadgeStyle(row.status)}>{row.status || "—"}</Text>
            </View>
            <Text style={[S.td, { width: 60, textAlign: "center", color: row.gap_severity === "High" ? C.noncomp : C.g600 }]}>
              {row.gap_severity || "—"}
            </Text>
            <Text style={[S.td, { flex: 1, color: C.g600, paddingRight: 4 }]}>
              {row.comment || "—"}
            </Text>
            <Text style={[S.td, { width: 90 }]}>
              {row.responsible_person || "—"}
            </Text>
          </View>
        ))}

        {rows.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: C.g400 }}>No assessments found for this framework.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
