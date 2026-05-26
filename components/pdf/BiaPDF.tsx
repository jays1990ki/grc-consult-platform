import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  primary:   "#0f766e", // teal-700
  accent:    "#14b8a6", // teal-400
  dark:      "#134e4a", // teal-900
  white:     "#ffffff",
  light:     "#f0fdfa", // teal-50
  gray:      "#6b7280",
  grayLight: "#f3f4f6",
  border:    "#e5e7eb",
  critical:  "#dc2626",
  high:      "#ea580c",
  medium:    "#d97706",
  low:       "#16a34a",
  // impact heat
  h1: "#fef2f2", h2: "#fde8d0", h3: "#fef9c3", h4: "#dcfce7", h5: "#f0fdf4",
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // pages
  coverPage: { backgroundColor: C.dark, padding: 0 },
  page:      { backgroundColor: C.white, padding: 40, fontSize: 9, fontFamily: "Helvetica" },

  // cover
  coverInner:     { flex: 1, padding: 56, justifyContent: "space-between" },
  coverBadge:     { backgroundColor: C.accent, color: C.dark, fontSize: 9, fontWeight: "bold",
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: "flex-start" },
  coverTitle:     { color: C.white, fontSize: 32, fontWeight: "bold", marginTop: 24, lineHeight: 1.25 },
  coverSubtitle:  { color: C.accent, fontSize: 14, marginTop: 8 },
  coverMeta:      { color: "#94a3b8", fontSize: 9, marginTop: 6 },
  coverFooter:    { borderTopWidth: 1, borderTopColor: "#1e6b63", paddingTop: 16 },
  coverFooterTxt: { color: "#94a3b8", fontSize: 8 },

  // section headers
  sectionTitle:   { fontSize: 13, fontWeight: "bold", color: C.primary, marginBottom: 12 },
  sectionDivider: { borderBottomWidth: 1.5, borderBottomColor: C.accent, marginBottom: 16 },

  // page header / footer
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8, marginBottom: 20 },
  pageHeaderLeft:  { fontSize: 8, color: C.gray },
  pageHeaderRight: { fontSize: 8, color: C.primary, fontWeight: "bold" },
  pageFooter: { flexDirection: "row", justifyContent: "space-between",
                borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 20 },
  pageFooterTxt: { fontSize: 7, color: C.gray },

  // stat cards
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: C.grayLight, borderRadius: 8,
              padding: 12, alignItems: "center" },
  statNum:  { fontSize: 22, fontWeight: "bold", color: C.primary },
  statLbl:  { fontSize: 7, color: C.gray, marginTop: 2, textAlign: "center" },

  // priority badges
  badgeCritical: { backgroundColor: "#fef2f2", color: C.critical, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontWeight: "bold" },
  badgeHigh:     { backgroundColor: "#fff7ed", color: C.high,     paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontWeight: "bold" },
  badgeMedium:   { backgroundColor: "#fffbeb", color: C.medium,   paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontWeight: "bold" },
  badgeLow:      { backgroundColor: "#f0fdf4", color: C.low,      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontWeight: "bold" },

  // tables
  tableHeader: { flexDirection: "row", backgroundColor: C.primary, paddingVertical: 6,
                 paddingHorizontal: 4, borderRadius: 4 },
  tableHeaderTxt: { color: C.white, fontWeight: "bold", fontSize: 7 },
  tableRow:    { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
                 borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowCritical: { backgroundColor: "#fef2f2" },
  tableRowHigh:     { backgroundColor: "#fff7ed" },
  tableRowAlt:      { backgroundColor: C.grayLight },
  tableTxt:    { fontSize: 7, color: "#374151" },

  // heatmap
  heatCell:    { width: 28, height: 28, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  heatTxt:     { fontSize: 8, fontWeight: "bold", color: "#374151" },
  heatLabel:   { fontSize: 6.5, color: C.gray, marginBottom: 2 },
});

// ── Data Types ────────────────────────────────────────────────────────────────
export interface BiaProcessData {
  id: number;
  process_name: string;
  process_owner: string | null;
  department: string | null;
  related_it_system: string | null;
  priority_level: string;
  mtpd: number | null;
  rto: number | null;
  rpo: number | null;
  status: string;
  has_impact: number;
  impact_1h?: number;
  impact_4h?: number;
  impact_24h?: number;
  impact_7d?: number;
  financial_impact?: number;
  legal_impact?: number;
  operational_impact?: number;
  reputation_impact?: number;
  customer_impact?: number;
  financial_loss_per_hour?: number;
}

export interface BiaReportData {
  orgName: string;
  generatedAt: string;
  processes: BiaProcessData[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    avgRto: number | null;
    totalLossPerDay: number;
    linkedAssets: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtH(h: number | null | undefined): string {
  if (!h) return "—";
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function priorityBadgeStyle(p: string): any {
  if (p === "Critical") return S.badgeCritical;
  if (p === "High")     return S.badgeHigh;
  if (p === "Medium")   return S.badgeMedium;
  return S.badgeLow;
}

function heatBg(score: number | undefined): string {
  if (!score) return "#f9fafb";
  if (score >= 5) return "#fca5a5";
  if (score >= 4) return "#fbbf24";
  if (score >= 3) return "#fde68a";
  if (score >= 2) return "#bbf7d0";
  return "#e0f2fe";
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PageHeader({ title, orgName }: { title: string; orgName: string }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text style={S.pageHeaderLeft}>{orgName} | Business Impact Analysis</Text>
      <Text style={S.pageHeaderRight}>{title}</Text>
    </View>
  );
}

function PageFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={S.pageFooter} fixed>
      <Text style={S.pageFooterTxt}>Generated by ME Corporation GRC Platform | Confidential</Text>
      <Text style={S.pageFooterTxt}>{generatedAt}</Text>
    </View>
  );
}

function HeatCell({ score }: { score: number | undefined }) {
  return (
    <View style={[S.heatCell, { backgroundColor: heatBg(score) }]}>
      <Text style={S.heatTxt}>{score ?? "—"}</Text>
    </View>
  );
}

// ── Main PDF Document ─────────────────────────────────────────────────────────
export function BiaPDF({ data }: { data: BiaReportData }) {
  const { orgName, generatedAt, processes, stats } = data;

  const criticalProcs  = processes.filter(p => p.priority_level === "Critical");
  const highProcs      = processes.filter(p => p.priority_level === "High");
  const assessed       = processes.filter(p => p.has_impact);
  const totalLoss      = stats.totalLossPerDay;

  return (
    <Document title={`BIA Report — ${orgName}`} author="ME Corporation GRC">

      {/* ── PAGE 1: Cover ─────────────────────────────────────────────────── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverInner}>
          <View>
            <Text style={S.coverBadge}>BUSINESS IMPACT ANALYSIS</Text>
            <Text style={S.coverTitle}>BIA{"\n"}Report</Text>
            <Text style={S.coverSubtitle}>{orgName}</Text>
            <Text style={S.coverMeta}>Generated: {generatedAt}</Text>
            <Text style={S.coverMeta}>Processes Analyzed: {stats.total} | Critical: {stats.critical} | Assessed: {assessed.length}</Text>
          </View>

          {/* Summary boxes */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
            {[
              { label: "Total Processes",   val: String(stats.total),    bg: "#1e6b63" },
              { label: "Critical",           val: String(stats.critical), bg: "#991b1b" },
              { label: "Avg RTO",            val: stats.avgRto ? fmtH(stats.avgRto) : "N/A", bg: "#1e6b63" },
              { label: "Loss / Day",         val: `฿${totalLoss.toLocaleString()}`, bg: "#78350f" },
            ].map(({ label, val, bg }) => (
              <View key={label} style={{ flex: 1, backgroundColor: bg, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: C.white, fontSize: 16, fontWeight: "bold" }}>{val}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 7, marginTop: 4 }}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={S.coverFooter}>
            <Text style={S.coverFooterTxt}>Generated by ME Corporation GRC Platform | Confidential</Text>
            <Text style={[S.coverFooterTxt, { marginTop: 3 }]}>
              This document is intended for authorized personnel only.
            </Text>
          </View>
        </View>
      </Page>

      {/* ── PAGE 2: Executive Summary ──────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Executive Summary" orgName={orgName} />

        <View style={S.sectionDivider}>
          <Text style={S.sectionTitle}>Executive Summary</Text>
        </View>

        {/* KPI cards */}
        <View style={S.statsRow}>
          {[
            { label: "Total Processes",        val: String(stats.total) },
            { label: "Critical Priority",       val: String(stats.critical) },
            { label: "High Priority",           val: String(stats.high) },
            { label: "Impact Assessed",         val: String(assessed.length) },
            { label: "Linked Assets (Critical)", val: String(stats.linkedAssets) },
          ].map(({ label, val }) => (
            <View key={label} style={S.statCard}>
              <Text style={S.statNum}>{val}</Text>
              <Text style={S.statLbl}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Priority breakdown */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>
            Priority Distribution
          </Text>
          {[
            { label: "Critical", count: stats.critical, color: C.critical, bg: "#fef2f2" },
            { label: "High",     count: stats.high,     color: C.high,     bg: "#fff7ed" },
            { label: "Medium",   count: stats.medium,   color: C.medium,   bg: "#fffbeb" },
            { label: "Low",      count: stats.low,      color: C.low,      bg: "#f0fdf4" },
          ].map(({ label, count, color, bg }) => {
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={{ width: 60 }}>
                  <Text style={{ fontSize: 7.5, color, fontWeight: "bold" }}>{label}</Text>
                </View>
                <View style={{ flex: 1, height: 14, backgroundColor: C.border, borderRadius: 7, marginHorizontal: 8 }}>
                  <View style={{ width: `${pct}%` as any, height: 14, backgroundColor: color, borderRadius: 7 }} />
                </View>
                <Text style={{ fontSize: 7.5, color, width: 36, textAlign: "right" }}>
                  {count} ({pct}%)
                </Text>
              </View>
            );
          })}
        </View>

        {/* Financial exposure */}
        <View style={{ backgroundColor: "#fff7ed", borderRadius: 8, padding: 16, marginBottom: 20,
                        borderLeftWidth: 4, borderLeftColor: C.high }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: C.high, marginBottom: 6 }}>
            Financial Exposure
          </Text>
          <Text style={{ fontSize: 9, color: "#374151", marginBottom: 4 }}>
            Estimated total financial loss per day: <Text style={{ fontWeight: "bold" }}>฿{totalLoss.toLocaleString()}</Text>
          </Text>
          {stats.avgRto !== null && (
            <Text style={{ fontSize: 9, color: "#374151" }}>
              Average Recovery Time Objective (RTO): <Text style={{ fontWeight: "bold" }}>{fmtH(stats.avgRto)}</Text>
            </Text>
          )}
        </View>

        {/* Key findings */}
        <View>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>
            Key Findings
          </Text>
          {criticalProcs.length > 0 && (
            <View style={{ flexDirection: "row", marginBottom: 5 }}>
              <Text style={{ fontSize: 8, color: C.critical, marginRight: 6 }}>•</Text>
              <Text style={{ fontSize: 8, color: "#374151", flex: 1 }}>
                {criticalProcs.length} critical business process{criticalProcs.length > 1 ? "es" : ""} identified:{" "}
                {criticalProcs.slice(0, 3).map(p => p.process_name).join(", ")}
                {criticalProcs.length > 3 ? ` and ${criticalProcs.length - 3} more` : ""}
              </Text>
            </View>
          )}
          {stats.linkedAssets > 0 && (
            <View style={{ flexDirection: "row", marginBottom: 5 }}>
              <Text style={{ fontSize: 8, color: C.high, marginRight: 6 }}>•</Text>
              <Text style={{ fontSize: 8, color: "#374151", flex: 1 }}>
                {stats.linkedAssets} unique IT asset{stats.linkedAssets > 1 ? "s" : ""} linked to critical processes — review Availability scores in Asset Register
              </Text>
            </View>
          )}
          {assessed.length < processes.length && (
            <View style={{ flexDirection: "row", marginBottom: 5 }}>
              <Text style={{ fontSize: 8, color: C.medium, marginRight: 6 }}>•</Text>
              <Text style={{ fontSize: 8, color: "#374151", flex: 1 }}>
                {processes.length - assessed.length} process{processes.length - assessed.length > 1 ? "es" : ""} have not yet completed impact assessment
              </Text>
            </View>
          )}
          {totalLoss > 0 && (
            <View style={{ flexDirection: "row", marginBottom: 5 }}>
              <Text style={{ fontSize: 8, color: C.primary, marginRight: 6 }}>•</Text>
              <Text style={{ fontSize: 8, color: "#374151", flex: 1 }}>
                Combined financial exposure of ฿{totalLoss.toLocaleString()} per day if all processes experience simultaneous disruption
              </Text>
            </View>
          )}
        </View>

        <PageFooter generatedAt={generatedAt} />
      </Page>

      {/* ── PAGE 3: Process Register (landscape) ─────────────────────────── */}
      <Page size="A4" orientation="landscape" style={[S.page, { paddingHorizontal: 36 }]}>
        <PageHeader title="Process Register" orgName={orgName} />

        <View style={S.sectionDivider}>
          <Text style={S.sectionTitle}>Business Process Register</Text>
        </View>

        {/* Table header */}
        <View style={S.tableHeader}>
          {[
            { label: "#",           w: 20 },
            { label: "Process Name",w: 130 },
            { label: "Owner",       w: 80 },
            { label: "Department",  w: 80 },
            { label: "Priority",    w: 52 },
            { label: "RTO",         w: 36 },
            { label: "RPO",         w: 36 },
            { label: "MTPD",        w: 36 },
            { label: "Status",      w: 50 },
            { label: "Assessed",    w: 50 },
          ].map(({ label, w }) => (
            <Text key={label} style={[S.tableHeaderTxt, { width: w }]}>{label}</Text>
          ))}
        </View>

        {processes.map((p, idx) => {
          const isCrit = p.priority_level === "Critical";
          const isHigh = p.priority_level === "High";
          const rowStyle = isCrit ? S.tableRowCritical : isHigh ? S.tableRowHigh : idx % 2 === 1 ? S.tableRowAlt : {};
          return (
            <View key={p.id} style={[S.tableRow, rowStyle]}>
              <Text style={[S.tableTxt, { width: 20 }]}>{idx + 1}</Text>
              <Text style={[S.tableTxt, { width: 130, fontWeight: isCrit ? "bold" : "normal" }]}>{p.process_name}</Text>
              <Text style={[S.tableTxt, { width: 80 }]}>{p.process_owner ?? "—"}</Text>
              <Text style={[S.tableTxt, { width: 80 }]}>{p.department ?? "—"}</Text>
              <View style={{ width: 52 }}>
                <Text style={[priorityBadgeStyle(p.priority_level), { textAlign: "center" }]}>
                  {p.priority_level}
                </Text>
              </View>
              <Text style={[S.tableTxt, { width: 36 }]}>{fmtH(p.rto)}</Text>
              <Text style={[S.tableTxt, { width: 36 }]}>{fmtH(p.rpo)}</Text>
              <Text style={[S.tableTxt, { width: 36 }]}>{fmtH(p.mtpd)}</Text>
              <Text style={[S.tableTxt, { width: 50 }]}>{p.status}</Text>
              <Text style={[S.tableTxt, { width: 50, color: p.has_impact ? C.primary : C.gray }]}>
                {p.has_impact ? "✓ Yes" : "Pending"}
              </Text>
            </View>
          );
        })}

        <PageFooter generatedAt={generatedAt} />
      </Page>

      {/* ── PAGE 4: Impact Heatmap (landscape) ───────────────────────────── */}
      {assessed.length > 0 && (
        <Page size="A4" orientation="landscape" style={[S.page, { paddingHorizontal: 36 }]}>
          <PageHeader title="Impact Heatmap" orgName={orgName} />

          <View style={S.sectionDivider}>
            <Text style={S.sectionTitle}>Impact Assessment Heatmap</Text>
          </View>

          {/* Legend */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Score 1 (Low)",      bg: "#e0f2fe" },
              { label: "Score 2",            bg: "#bbf7d0" },
              { label: "Score 3 (Medium)",   bg: "#fde68a" },
              { label: "Score 4",            bg: "#fbbf24" },
              { label: "Score 5 (Critical)", bg: "#fca5a5" },
            ].map(({ label, bg }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 12, height: 12, backgroundColor: bg, borderRadius: 2 }} />
                <Text style={{ fontSize: 6.5, color: C.gray }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Heatmap table header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <View style={{ width: 120 }} />
            {[
              "1h", "4h", "24h", "7d",
              "Fin", "Legal", "Ops", "Rep", "Cust",
            ].map(lbl => (
              <View key={lbl} style={{ width: 32, alignItems: "center" }}>
                <Text style={S.heatLabel}>{lbl}</Text>
              </View>
            ))}
            <View style={{ width: 60, alignItems: "flex-end" }}>
              <Text style={S.heatLabel}>Loss/hr</Text>
            </View>
          </View>

          {assessed.map((p, idx) => (
            <View key={p.id}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 3,
                       backgroundColor: idx % 2 === 0 ? C.grayLight : C.white,
                       borderRadius: 4, paddingVertical: 2, paddingHorizontal: 4 }}>
              <View style={{ width: 120 }}>
                <Text style={{ fontSize: 7, color: "#374151", fontWeight: p.priority_level === "Critical" ? "bold" : "normal" }}>
                  {p.process_name.length > 20 ? p.process_name.slice(0, 19) + "…" : p.process_name}
                </Text>
                <View style={[priorityBadgeStyle(p.priority_level), { alignSelf: "flex-start", marginTop: 1 }]}>
                  <Text style={{ fontSize: 5.5 }}>{p.priority_level}</Text>
                </View>
              </View>
              {[p.impact_1h, p.impact_4h, p.impact_24h, p.impact_7d,
                p.financial_impact, p.legal_impact, p.operational_impact,
                p.reputation_impact, p.customer_impact,
              ].map((score, i) => (
                <View key={i} style={{ width: 32, alignItems: "center" }}>
                  <HeatCell score={score} />
                </View>
              ))}
              <View style={{ width: 60, alignItems: "flex-end" }}>
                <Text style={{ fontSize: 7, color: "#374151" }}>
                  {p.financial_loss_per_hour
                    ? `฿${Number(p.financial_loss_per_hour).toLocaleString()}`
                    : "—"}
                </Text>
              </View>
            </View>
          ))}

          <PageFooter generatedAt={generatedAt} />
        </Page>
      )}

      {/* ── PAGE 5: Financial Exposure ────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Financial Exposure" orgName={orgName} />

        <View style={S.sectionDivider}>
          <Text style={S.sectionTitle}>Financial Exposure Analysis</Text>
        </View>

        {/* Top processes by financial loss */}
        <Text style={{ fontSize: 9, fontWeight: "bold", color: "#374151", marginBottom: 10 }}>
          Processes by Financial Loss per Hour
        </Text>

        <View style={S.tableHeader}>
          {[
            { label: "Process Name",     w: 150 },
            { label: "Priority",         w: 60 },
            { label: "Department",       w: 90 },
            { label: "RTO",              w: 40 },
            { label: "Loss / Hour",      w: 80 },
            { label: "Loss / Day (est)", w: 90 },
          ].map(({ label, w }) => (
            <Text key={label} style={[S.tableHeaderTxt, { width: w }]}>{label}</Text>
          ))}
        </View>

        {[...assessed]
          .sort((a, b) => (b.financial_loss_per_hour ?? 0) - (a.financial_loss_per_hour ?? 0))
          .map((p, idx) => {
            const lossHr  = p.financial_loss_per_hour ?? 0;
            const lossDay = Math.round(lossHr * 24);
            const isCrit  = p.priority_level === "Critical";
            return (
              <View key={p.id} style={[S.tableRow, isCrit ? S.tableRowCritical : idx % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={[S.tableTxt, { width: 150 }]}>{p.process_name}</Text>
                <View style={{ width: 60 }}>
                  <Text style={priorityBadgeStyle(p.priority_level)}>{p.priority_level}</Text>
                </View>
                <Text style={[S.tableTxt, { width: 90 }]}>{p.department ?? "—"}</Text>
                <Text style={[S.tableTxt, { width: 40 }]}>{fmtH(p.rto)}</Text>
                <Text style={[S.tableTxt, { width: 80 }]}>
                  {lossHr > 0 ? `฿${lossHr.toLocaleString()}` : "—"}
                </Text>
                <Text style={[S.tableTxt, { width: 90, fontWeight: lossDay > 0 ? "bold" : "normal",
                              color: lossDay > 100000 ? C.critical : "#374151" }]}>
                  {lossDay > 0 ? `฿${lossDay.toLocaleString()}` : "—"}
                </Text>
              </View>
            );
          })}

        {/* Total row */}
        {assessed.length > 0 && (
          <View style={[S.tableRow, { backgroundColor: C.light, borderTopWidth: 1.5, borderTopColor: C.primary }]}>
            <Text style={[S.tableTxt, { width: 150, fontWeight: "bold" }]}>TOTAL (all processes)</Text>
            <View style={{ width: 60 }} />
            <View style={{ width: 90 }} />
            <View style={{ width: 40 }} />
            <Text style={[S.tableTxt, { width: 80 }]}>
              ฿{assessed.reduce((s, p) => s + (p.financial_loss_per_hour ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={[S.tableTxt, { width: 90, fontWeight: "bold", color: C.primary }]}>
              ฿{totalLoss.toLocaleString()}
            </Text>
          </View>
        )}

        <PageFooter generatedAt={generatedAt} />
      </Page>

    </Document>
  );
}
