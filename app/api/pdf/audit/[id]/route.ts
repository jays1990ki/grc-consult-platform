import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { AuditPDF, type AuditReportData, type AuditEvidenceRow } from "@/components/pdf/AuditPDF";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = orgId(req);
  const pid = Number(params.id);
  const db  = getDb();

  try {
    const project = db.prepare(
      "SELECT * FROM audit_projects WHERE id = ? AND organization_id = ?"
    ).get(pid, org) as any;
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Fetch evidence with latest file metadata
    const evidence = db.prepare(`
      SELECT er.*,
             COUNT(ef.id) AS file_count,
             MAX(ef.version_number) AS latest_version,
             (SELECT ef2.auditor_comment
              FROM evidence_files ef2
              WHERE ef2.evidence_request_id = er.id
              ORDER BY ef2.version_number DESC LIMIT 1) AS auditor_comment,
             (SELECT ef3.review_date
              FROM evidence_files ef3
              WHERE ef3.evidence_request_id = er.id
              ORDER BY ef3.version_number DESC LIMIT 1) AS review_date
      FROM evidence_requests er
      LEFT JOIN evidence_files ef ON ef.evidence_request_id = er.id
      WHERE er.audit_project_id = ? AND er.organization_id = ?
      GROUP BY er.id
      ORDER BY
        CASE er.status
          WHEN 'Fail'          THEN 1
          WHEN 'Need Revision' THEN 2
          WHEN 'Submitted'     THEN 3
          WHEN 'Under Review'  THEN 4
          WHEN 'Not Submitted' THEN 5
          ELSE 6
        END,
        er.due_date ASC
    `).all(pid, org) as AuditEvidenceRow[];

    const reportData: AuditReportData = {
      project,
      evidence,
      generatedAt: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
    };

    const buffer = await renderToBuffer(
      React.createElement(AuditPDF, { data: reportData }) as React.ReactElement<any>
    );

    const date    = new Date().toISOString().slice(0, 10);
    const safeName = project.project_name.replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Audit-Report-${safeName}-${date}.pdf"`,
      },
    });
  } finally {
    db.close();
  }
}
