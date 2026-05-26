import React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary:  "#1e3a5f",
  accent:   "#0f766e",    // teal for treatment theme
  critical: "#dc2626",
  medium:   "#ea580c",
  low:      "#16a34a",
  done:     "#0f766e",
  inprog:   "#2563eb",
  todo:     "#6b7280",
  overdue:  "#dc2626",
  g50:  "#f9fafb",
  g100: "#f3f4f6",
  g200: "#e5e7eb",
  g400: "#9ca3af",
  g600: "#4b5563",
  g800: "#1f2937",
  white: "#ffffff",
};

const S = StyleSheet.create({
  cover: {
    backgroundColor: C.accent,
    padding: 60,
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  coverOrg:   { fontSize: 10, color: "#99f6e4", letterSpacing: 2 },
  coverTitle: { fontSize: 30, color: C.white, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  coverSub:   { fontSize: 13, color: "#99f6e4", marginTop: 8 },
  coverMeta:  { fontSize: 10, color: "#5eead4" },
  coverFooter: { fontSize: 9, color: "#0d9488", borderTopWidth: 1, borderTopColor: "#0f766e", paddingTop: 12 },

  page: {
    paddingTop: 65, paddingBottom: 55, paddingHorizontal: 40,
    fontFamily: "Helvetica", fontSize: 9, color: C.g800,
  },
  header: {
    position: "absolute", top: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: C.g200, paddingBottom: 6,
  },
  footer: {
    position: "absolute", bottom: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: C.g200, paddingTop: 6,
  },
  headerOrg: { fontSize: 8, color: C.g400, fontFamily: "Helvetica-Bold" },
  headerTitle: { fontSize: 8, color: C.g400 },
  footerText: { fontSize: 7, color: C.g400 },
  pageNumber: { fontSize: 7, color: C.g400 },

  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 14 },
  sectionDesc:  { fontSize: 9, color: C.g600, marginBottom: 16 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 6, padding: 12,
    backgroundColor: C.g50, borderWidth: 1, borderColor: C.g200,
  },
  statLabel: { fontSize: 8, color: C.g600, marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  statSub:   { fontSize: 7, color: C.g400, marginTop: 2 },

  // Table
  th: { backgroundColor: C.accent, paddingVertical: 6, paddingHorizontal: 4, flexDirection: "row" },
  thText: { fontSize: 8, color: C.white, fontFamily: "Helvetica-Bold" },
  tr:    { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.g100 },
  trAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, backgroundColor: C.g50, borderBottomWidth: 1, borderBottomColor: C.g100 },
  trOverdue: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
    backgroundColor: "#fff1f2", borderBottomWidth: 1, borderBottomColor: "#fee2e2",
    borderLeftWidth: 3, borderLeftColor: C.overdue,
  },
  td: { fontSize: 8, color: C.g800 },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TreatmentRow {
  id: number;
  risk_id: number;
  threat_name: string;
  risk_level: string;
  treatment_option: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  budget: number | null;
  expected_residual_risk: number | null;
  residual_risk_score: number | null;
  inherent_risk: number;
}

export interface TreatmentPlanData {
  orgName:     string;
  generatedAt: string;
  stats: {
    total:    number;
    done:     number;
    inProg:   number;
    overdue:  number;
    totalBudget: number;
  };
  treatments: TreatmentRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(s: string | null): string {
  if (!s) return C.todo;
  if (s === "Done" || s === "Accepted by Management") return C.done;
  if (s === "In Progress") return C.inprog;
  if (s === "To Do") return C.todo;
  return C.g400;
}

function statusBg(s: string | null): string {
  if (!s) return C.g100;
  if (s === "Done" || s === "Accepted by Management") return "#ccfbf1";
  if (s === "In Progress") return "#dbeafe";
  return C.g100;
}

function isOverdue(dueDate: string | null, status: string | null): boolean {
  if (!dueDate || status === "Done" || status === "Accepted by Management") return false;
  return new Date(dueDate) < new Date();
}

function optionColor(opt: string | null): string {
  if (opt === "Mitigate") return C.inprog;
  if (opt === "Transfer") return "#7c3aed";
  if (opt === "Avoid")    return C.medium;
  if (opt === "Accept")   return C.g400;
  return C.g400;
}

function levelColor(level: string): string {
  if (level === "Critical") return C.critical;
  if (level === "Medium")   return C.medium;
  return C.low;
}

// ── PDF Document ──────────────────────────────────────────────────────────────
export function TreatmentPlanPDF({ data }: { data: TreatmentPlanData }) {
  const { orgName, generatedAt, stats, treatments } = data;

  const Header = () => (
    <View style={S.header} fixed>
      <Text style={S.headerOrg}>{orgName} — Treatment Plan Report</Text>
      <Text style={S.headerTitle}>Generated: {generatedAt}</Text>
    </View>
  );
  const Footer = () => (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>Generated by ME Corporation GRC Platform | Confidential</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <Document title={`Treatment Plan — ${orgName}`} author="ME Corporation GRC Platform">

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <Page size="A4">
        <View style={S.cover}>
          <View>
            <Text style={S.coverOrg}>{orgName}</Text>
            <View style={{ marginTop: 80 }}>
              <Text style={S.coverTitle}>Risk Treatment{"\n"}Plan Report</Text>
              <Text style={S.coverSub}>Mitigation & Risk Reduction Status</Text>
            </View>
          </View>
          <View>
            <Text style={S.coverMeta}>Generated: {generatedAt}</Text>
            <Text style={[S.coverMeta, { marginTop: 4 }]}>
              {stats.total} treatment{stats.total !== 1 ? "s" : ""} tracked · {completionPct}% complete
            </Text>
            {stats.overdue > 0 && (
              <Text style={[S.coverMeta, { marginTop: 4, color: "#fca5a5" }]}>
                ⚠  {stats.overdue} overdue item{stats.overdue !== 1 ? "s" : ""} require attention
              </Text>
            )}
            <View style={{ marginTop: 40 }}>
              <Text style={S.coverFooter}>CONFIDENTIAL — For internal use only.</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── SUMMARY + TABLE ───────────────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Treatment Summary</Text>

        {/* Stats */}
        <View style={S.statsRow}>
          {[
            { label: "Total Treatments", val: stats.total,   color: C.g800,    sub: "tracked" },
            { label: "Completed",         val: stats.done,    color: C.done,     sub: `${completionPct}% done` },
            { label: "In Progress",       val: stats.inProg,  color: C.inprog,   sub: "active" },
            { label: "Overdue",           val: stats.overdue, color: C.overdue,  sub: "past due date" },
          ].map(({ label, val, color, sub }) => (
            <View key={label} style={S.statCard}>
              <Text style={S.statLabel}>{label}</Text>
              <Text style={[S.statValue, { color }]}>{val}</Text>
              <Text style={S.statSub}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 9, color: C.g600 }}>Overall Completion</Text>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.done }}>{completionPct}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: C.g200, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, width: `${completionPct}%` as `${number}%`, backgroundColor: C.done, borderRadius: 4 }} />
          </View>
        </View>

        {stats.totalBudget > 0 && (
          <View style={{ backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4", borderRadius: 6, padding: 10, marginBottom: 16 }}>
            <Text style={{ fontSize: 9, color: C.g600 }}>Total Treatment Budget</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: C.accent, marginTop: 2 }}>
              ฿{stats.totalBudget.toLocaleString()}
            </Text>
          </View>
        )}
      </Page>

      {/* ── TREATMENT TABLE (landscape) ───────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={[S.page, { paddingTop: 65 }]}>
        <Header />
        <Footer />

        <Text style={S.sectionTitle}>Treatment Details</Text>
        <Text style={[S.sectionDesc, { marginBottom: 10 }]}>
          Overdue items (past due date, not completed) are highlighted in red.
        </Text>

        {/* Table header */}
        <View style={S.th}>
          <Text style={[S.thText, { flex: 1 }]}>Risk / Threat Name</Text>
          <Text style={[S.thText, { width: 60, textAlign: "center" }]}>Level</Text>
          <Text style={[S.thText, { width: 80, textAlign: "center" }]}>Option</Text>
          <Text style={[S.thText, { width: 100, textAlign: "center" }]}>Status</Text>
          <Text style={[S.thText, { width: 85 }]}>Owner</Text>
          <Text style={[S.thText, { width: 70, textAlign: "center" }]}>Due Date</Text>
          <Text style={[S.thText, { width: 70, textAlign: "right" }]}>Budget (฿)</Text>
          <Text style={[S.thText, { width: 60, textAlign: "center" }]}>Residual</Text>
          <Text style={[S.thText, { width: 55, textAlign: "center" }]}>Score</Text>
        </View>

        {treatments.map((t, idx) => {
          const overdue = isOverdue(t.due_date, t.status);
          const rowStyle = overdue ? S.trOverdue : idx % 2 === 0 ? S.tr : S.trAlt;
          const residualPct = t.residual_risk_score != null && t.inherent_risk > 0
            ? Math.round((1 - t.residual_risk_score / t.inherent_risk) * 100)
            : null;

          return (
            <View key={t.id} style={rowStyle} wrap={false}>
              <Text style={[S.td, { flex: 1, paddingRight: 6 }]}>{t.threat_name}</Text>
              <View style={{ width: 60, alignItems: "center", justifyContent: "center" }}>
                <Text style={{
                  fontSize: 7, fontFamily: "Helvetica-Bold",
                  color: levelColor(t.risk_level) === C.critical ? "#991b1b" : levelColor(t.risk_level) === C.medium ? "#9a3412" : "#166534",
                  backgroundColor: t.risk_level === "Critical" ? "#fee2e2" : t.risk_level === "Medium" ? "#ffedd5" : "#dcfce7",
                  paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3,
                }}>
                  {t.risk_level}
                </Text>
              </View>
              <View style={{ width: 80, alignItems: "center", justifyContent: "center" }}>
                <Text style={{
                  fontSize: 7, color: optionColor(t.treatment_option),
                  fontFamily: "Helvetica-Bold",
                }}>
                  {t.treatment_option ?? "—"}
                </Text>
              </View>
              <View style={{ width: 100, alignItems: "center", justifyContent: "center" }}>
                <Text style={{
                  fontSize: 7, fontFamily: "Helvetica-Bold",
                  color: statusColor(t.status),
                  backgroundColor: statusBg(t.status),
                  paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3,
                }}>
                  {t.status ?? "To Do"}{overdue ? " ⚠" : ""}
                </Text>
              </View>
              <Text style={[S.td, { width: 85 }]}>{t.owner ?? "—"}</Text>
              <Text style={[S.td, { width: 70, textAlign: "center", color: overdue ? C.overdue : C.g600 }]}>
                {t.due_date ? t.due_date.slice(0, 10) : "—"}
              </Text>
              <Text style={[S.td, { width: 70, textAlign: "right" }]}>
                {t.budget != null ? t.budget.toLocaleString() : "—"}
              </Text>
              <Text style={[S.td, { width: 60, textAlign: "center", color: residualPct != null ? C.done : C.g400 }]}>
                {residualPct != null ? `−${residualPct}%` : "—"}
              </Text>
              <Text style={[S.td, { width: 55, textAlign: "center", fontFamily: "Helvetica-Bold", color: t.residual_risk_score != null ? C.done : C.g400 }]}>
                {t.residual_risk_score != null ? Number(t.residual_risk_score).toFixed(1) : "—"}
              </Text>
            </View>
          );
        })}

        {treatments.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: C.g400 }}>No treatments found.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
