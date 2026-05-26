import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  primary:   "#1e3a5f",
  accent:    "#3b82f6",
  dark:      "#0f172a",
  white:     "#ffffff",
  light:     "#eff6ff",
  gray:      "#6b7280",
  grayLight: "#f3f4f6",
  border:    "#e5e7eb",
  pass:      "#16a34a",
  passBg:    "#f0fdf4",
  fail:      "#dc2626",
  failBg:    "#fef2f2",
  revision:  "#d97706",
  revBg:     "#fffbeb",
  pending:   "#6b7280",
  pendBg:    "#f9fafb",
  submitted: "#2563eb",
  subBg:     "#eff6ff",
};

const S = StyleSheet.create({
  // Cover
  coverPage:    { backgroundColor: C.dark, padding: 0 },
  coverInner:   { flex: 1, padding: 56, justifyContent: "space-between" },
  coverBadge:   { backgroundColor: C.accent, color: C.white, fontSize: 9, fontWeight: "bold",
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: "flex-start" },
  coverTitle:   { color: C.white, fontSize: 30, fontWeight: "bold", marginTop: 24, lineHeight: 1.3 },
  coverSub:     { color: "#93c5fd", fontSize: 13, marginTop: 8 },
  coverMeta:    { color: "#94a3b8", fontSize: 8.5, marginTop: 4 },
  coverBox:     { backgroundColor: "#1e2d42", borderRadius: 8, padding: 12, marginTop: 6 },
  coverBoxLabel:{ color: "#64748b", fontSize: 7.5, marginBottom: 2 },
  coverBoxVal:  { color: C.white, fontSize: 10, fontWeight: "bold" },
  coverFooter:  { borderTopWidth: 1, borderTopColor: "#1e2d42", paddingTop: 14 },
  coverFooterTxt:{ color: "#64748b", fontSize: 7.5 },

  // Pages
  page:         { backgroundColor: C.white, padding: 40, fontSize: 9, fontFamily: "Helvetica" },
  pageLandscape:{ backgroundColor: C.white, padding: 36, fontSize: 8.5, fontFamily: "Helvetica" },

  // Page header/footer
  pageHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8, marginBottom: 20 },
  pageHeaderL:  { fontSize: 8, color: C.gray },
  pageHeaderR:  { fontSize: 8, color: C.primary, fontWeight: "bold" },
  pageFooter:   { flexDirection: "row", justifyContent: "space-between",
                  borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 20 },
  pageFooterTxt:{ fontSize: 7, color: C.gray },

  // Section
  sectionTitle:   { fontSize: 13, fontWeight: "bold", color: C.primary, marginBottom: 10 },
  sectionDivider: { borderBottomWidth: 1.5, borderBottomColor: C.accent, marginBottom: 16 },

  // Stat cards
  statsRow:  { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:  { flex: 1, backgroundColor: C.grayLight, borderRadius: 8, padding: 12, alignItems: "center" },
  statNum:   { fontSize: 22, fontWeight: "bold", color: C.primary },
  statLbl:   { fontSize: 7, color: C.gray, marginTop: 3, textAlign: "center" },

  // Progress bar
  progressBg:  { height: 14, backgroundColor: C.border, borderRadius: 7 },
  progressFill:{ height: 14, backgroundColor: C.accent, borderRadius: 7 },

  // Tables
  tableHeader:    { flexDirection: "row", backgroundColor: C.primary, paddingVertical: 6,
                    paddingHorizontal: 4, borderRadius: 4 },
  tableHeaderTxt: { color: C.white, fontWeight: "bold", fontSize: 7 },
  tableRow:       { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4,
                    borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowFail:   { backgroundColor: C.failBg },
  tableRowPass:   { backgroundColor: C.passBg },
  tableRowAlt:    { backgroundColor: C.grayLight },
  tableTxt:       { fontSize: 7, color: "#374151" },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuditEvidenceRow {
  id: number;
  requirement_id: string | null;
  evidence_name: string;
  evidence_description: string | null;
  assigned_owner: string | null;
  due_date: string | null;
  status: string;
  file_count: number;
  latest_version: number | null;
  auditor_comment: string | null;
  review_date: string | null;
}

export interface AuditReportData {
  project: {
    id: number;
    project_name: string;
    framework: string | null;
    auditor_name: string | null;
    client_name: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
  };
  evidence: AuditEvidenceRow[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(s: string): string {
  if (s === "Pass")          return C.pass;
  if (s === "Fail")          return C.fail;
  if (s === "Need Revision") return C.revision;
  if (s === "Submitted" || s === "Under Review") return C.submitted;
  return C.pending;
}
function statusBg(s: string): string {
  if (s === "Pass")          return C.passBg;
  if (s === "Fail")          return C.failBg;
  if (s === "Need Revision") return C.revBg;
  if (s === "Submitted" || s === "Under Review") return C.subBg;
  return C.pendBg;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return d.slice(0, 10);
}

function isOverdue(row: AuditEvidenceRow): boolean {
  if (!row.due_date || row.status === "Pass" || row.status === "Fail") return false;
  return row.due_date < new Date().toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PageHeader({ left, right }: { left: string; right: string }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text style={S.pageHeaderL}>{left}</Text>
      <Text style={S.pageHeaderR}>{right}</Text>
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

// ── Main PDF ──────────────────────────────────────────────────────────────────
export function AuditPDF({ data }: { data: AuditReportData }) {
  const { project, evidence, generatedAt } = data;

  const total     = evidence.length;
  const passed    = evidence.filter(e => e.status === "Pass").length;
  const failed    = evidence.filter(e => e.status === "Fail").length;
  const pending   = evidence.filter(e => !["Pass","Fail"].includes(e.status)).length;
  const submitted = evidence.filter(e => e.status === "Submitted").length;
  const revision  = evidence.filter(e => e.status === "Need Revision").length;
  const overdue   = evidence.filter(isOverdue).length;
  const completionPct = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;
  const passPct       = total > 0 ? Math.round((passed / total) * 100) : 0;

  const failedItems = evidence.filter(e => e.status === "Fail");

  return (
    <Document title={`Audit Report — ${project.project_name}`} author="ME Corporation GRC">

      {/* ── PAGE 1: Cover ─────────────────────────────────────────────────── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverInner}>
          <View>
            <Text style={S.coverBadge}>IT AUDIT EVIDENCE REPORT</Text>
            <Text style={S.coverTitle}>{project.project_name}</Text>
            <Text style={S.coverSub}>{project.framework ?? "Internal Audit"}</Text>
            <Text style={S.coverMeta}>Generated: {generatedAt}</Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
              {[
                { label: "Auditor",     val: project.auditor_name ?? "—" },
                { label: "Client",      val: project.client_name  ?? "—" },
                { label: "Start Date",  val: fmtDate(project.start_date) },
                { label: "End Date",    val: fmtDate(project.end_date) },
              ].map(({ label, val }) => (
                <View key={label} style={[S.coverBox, { flex: 1 }]}>
                  <Text style={S.coverBoxLabel}>{label}</Text>
                  <Text style={S.coverBoxVal}>{val}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              {[
                { label: "Status",           val: project.status,            color: C.accent },
                { label: "Total Evidence",   val: String(total),             color: C.white },
                { label: "Passed",           val: String(passed),            color: "#86efac" },
                { label: "Failed",           val: String(failed),            color: "#fca5a5" },
                { label: "Completion",       val: `${completionPct}%`,       color: "#93c5fd" },
              ].map(({ label, val, color }) => (
                <View key={label} style={[S.coverBox, { flex: 1, alignItems: "center" }]}>
                  <Text style={{ color, fontSize: 16, fontWeight: "bold" }}>{val}</Text>
                  <Text style={S.coverBoxLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={S.coverFooter}>
            <Text style={S.coverFooterTxt}>Generated by ME Corporation GRC Platform | Confidential</Text>
            <Text style={[S.coverFooterTxt, { marginTop: 3 }]}>
              This document is intended for authorized personnel only.
            </Text>
          </View>
        </View>
      </Page>

      {/* ── PAGE 2: Summary ───────────────────────────────────────────────── */}
      <Page size="A4" style={S.page}>
        <PageHeader
          left={`${project.project_name} | ${project.framework ?? "—"}`}
          right="Audit Summary"
        />

        <View style={S.sectionDivider}>
          <Text style={S.sectionTitle}>Audit Summary</Text>
        </View>

        {/* KPI cards */}
        <View style={S.statsRow}>
          {[
            { label: "Total Evidence Items", val: String(total) },
            { label: "Passed",               val: String(passed) },
            { label: "Failed",               val: String(failed) },
            { label: "Pending Review",       val: String(pending) },
            { label: "Overdue",              val: String(overdue) },
          ].map(({ label, val }) => (
            <View key={label} style={S.statCard}>
              <Text style={S.statNum}>{val}</Text>
              <Text style={S.statLbl}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Completion progress */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: "#374151" }}>
              Overall Completion
            </Text>
            <Text style={{ fontSize: 9, color: C.primary, fontWeight: "bold" }}>
              {passed + failed} of {total} reviewed ({completionPct}%)
            </Text>
          </View>
          <View style={S.progressBg}>
            <View style={[S.progressFill, { width: `${completionPct}%` as any }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 7, color: C.pass }}>Pass rate: {passPct}%</Text>
            {overdue > 0 && (
              <Text style={{ fontSize: 7, color: C.fail }}>⚠ {overdue} item{overdue > 1 ? "s" : ""} overdue</Text>
            )}
          </View>
        </View>

        {/* Status breakdown */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>
            Status Breakdown
          </Text>
          {[
            { label: "Pass",          count: passed,    color: C.pass,     bg: C.passBg },
            { label: "Fail",          count: failed,    color: C.fail,     bg: C.failBg },
            { label: "Need Revision", count: revision,  color: C.revision, bg: C.revBg },
            { label: "Submitted",     count: submitted, color: C.submitted,bg: C.subBg },
            { label: "Not Submitted", count: pending - submitted - revision, color: C.pending, bg: C.pendBg },
          ].filter(r => r.count > 0).map(({ label, count, color, bg }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
                <View style={{ width: 80 }}>
                  <Text style={{ fontSize: 7.5, color, fontWeight: "bold" }}>{label}</Text>
                </View>
                <View style={{ flex: 1, height: 12, backgroundColor: C.border, borderRadius: 6, marginHorizontal: 8 }}>
                  <View style={{ width: `${pct}%` as any, height: 12, backgroundColor: color, borderRadius: 6 }} />
                </View>
                <Text style={{ fontSize: 7.5, color, width: 36, textAlign: "right" }}>
                  {count} ({pct}%)
                </Text>
              </View>
            );
          })}
        </View>

        {/* Failed items callout */}
        {failedItems.length > 0 && (
          <View style={{ backgroundColor: C.failBg, borderRadius: 8, padding: 14,
                          borderLeftWidth: 4, borderLeftColor: C.fail }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: C.fail, marginBottom: 6 }}>
              ⚠ Failed Evidence Items ({failedItems.length})
            </Text>
            {failedItems.map(fi => (
              <View key={fi.id} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: C.fail, marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 8, color: "#374151", flex: 1 }}>
                  <Text style={{ fontWeight: "bold" }}>{fi.evidence_name}</Text>
                  {fi.auditor_comment ? ` — ${fi.auditor_comment}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <PageFooter generatedAt={generatedAt} />
      </Page>

      {/* ── PAGE 3: Evidence Table (landscape) ───────────────────────────── */}
      <Page size="A4" orientation="landscape" style={S.pageLandscape}>
        <PageHeader
          left={`${project.project_name} | ${project.framework ?? "—"}`}
          right="Evidence Checklist"
        />

        <View style={S.sectionDivider}>
          <Text style={S.sectionTitle}>Evidence Checklist</Text>
        </View>

        {/* Table header */}
        <View style={S.tableHeader}>
          {[
            { label: "#",           w: 18 },
            { label: "Req ID",      w: 45 },
            { label: "Evidence Name",w: 130 },
            { label: "Assigned To", w: 80 },
            { label: "Due Date",    w: 55 },
            { label: "Status",      w: 70 },
            { label: "Files",       w: 28 },
            { label: "Auditor Comment", w: 150 },
            { label: "Review Date", w: 55 },
          ].map(({ label, w }) => (
            <Text key={label} style={[S.tableHeaderTxt, { width: w }]}>{label}</Text>
          ))}
        </View>

        {evidence.map((ev, idx) => {
          const isFail  = ev.status === "Pass" ? false : ev.status === "Fail";
          const isPass  = ev.status === "Pass";
          const overdueMark = isOverdue(ev);
          const rowBg = isFail ? S.tableRowFail : isPass ? S.tableRowPass : idx % 2 === 1 ? S.tableRowAlt : {};

          return (
            <View key={ev.id} style={[S.tableRow, rowBg]}>
              <Text style={[S.tableTxt, { width: 18 }]}>{idx + 1}</Text>
              <Text style={[S.tableTxt, { width: 45, color: C.gray }]}>{ev.requirement_id ?? "—"}</Text>
              <Text style={[S.tableTxt, { width: 130, fontWeight: isFail ? "bold" : "normal" }]}>
                {ev.evidence_name}
              </Text>
              <Text style={[S.tableTxt, { width: 80 }]}>{ev.assigned_owner ?? "—"}</Text>
              <Text style={[S.tableTxt, { width: 55, color: overdueMark ? C.fail : "#374151" }]}>
                {fmtDate(ev.due_date)}{overdueMark ? " ⚠" : ""}
              </Text>
              <View style={{ width: 70 }}>
                <View style={{ backgroundColor: statusBg(ev.status), borderRadius: 4,
                               paddingHorizontal: 4, paddingVertical: 2, alignSelf: "flex-start" }}>
                  <Text style={{ fontSize: 6.5, fontWeight: "bold", color: statusColor(ev.status) }}>
                    {ev.status}
                  </Text>
                </View>
              </View>
              <Text style={[S.tableTxt, { width: 28, textAlign: "center", color: C.gray }]}>
                {ev.file_count ?? 0}
              </Text>
              <Text style={[S.tableTxt, { width: 150, color: isFail ? C.fail : "#374151" }]}>
                {ev.auditor_comment ?? "—"}
              </Text>
              <Text style={[S.tableTxt, { width: 55, color: C.gray }]}>
                {fmtDate(ev.review_date)}
              </Text>
            </View>
          );
        })}

        <PageFooter generatedAt={generatedAt} />
      </Page>

    </Document>
  );
}
