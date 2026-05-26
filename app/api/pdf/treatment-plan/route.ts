import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { TreatmentPlanPDF, type TreatmentPlanData } from "@/components/pdf/TreatmentPlanPDF";
import { getSession } from "@/lib/auth/session";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

function orgId(req: NextRequest): number {
  return Number(
    req.headers.get("x-org-id") ??
    new URL(req.url).searchParams.get("orgId") ??
    1
  );
}

function getOrgName(db: ReturnType<typeof getDb>, org: number): string {
  try {
    const row = db.prepare("SELECT name FROM organizations WHERE id = ?").get(org) as any;
    return row?.name ?? "CAT INFONET";
  } catch { return "CAT INFONET"; }
}

function isOverdue(dueDate: string | null, status: string | null): boolean {
  if (!dueDate || status === "Done" || status === "Accepted by Management") return false;
  return new Date(dueDate) < new Date();
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const db  = getDb();

  try {
    const orgName = getOrgName(db, org);
    const now = new Date();
    const generatedAt = now.toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // Treatments joined with risk assessments
    const treatments = db.prepare(`
      SELECT rt.*,
             ra.threat_name, ra.inherent_risk, ra.risk_level
      FROM risk_treatments rt
      JOIN risk_assessments ra ON ra.id = rt.risk_id
      WHERE rt.organization_id = ?
      ORDER BY
        CASE ra.risk_level
          WHEN 'Critical' THEN 1
          WHEN 'Medium'   THEN 2
          ELSE 3
        END,
        ra.inherent_risk DESC
    `).all(org) as any[];

    const done    = treatments.filter(t => t.status === "Done" || t.status === "Accepted by Management").length;
    const inProg  = treatments.filter(t => t.status === "In Progress").length;
    const overdue = treatments.filter(t => isOverdue(t.due_date, t.status)).length;
    const totalBudget = treatments.reduce((s, t) => s + (t.budget ?? 0), 0);

    const data: TreatmentPlanData = {
      orgName,
      generatedAt,
      stats: {
        total: treatments.length,
        done,
        inProg,
        overdue,
        totalBudget,
      },
      treatments: treatments.map(t => ({
        id:                     t.id,
        risk_id:                t.risk_id,
        threat_name:            t.threat_name,
        risk_level:             t.risk_level,
        treatment_option:       t.treatment_option   ?? null,
        status:                 t.status             ?? null,
        owner:                  t.owner              ?? null,
        due_date:               t.due_date           ?? null,
        budget:                 t.budget             ?? null,
        expected_residual_risk: t.expected_residual_risk ?? null,
        residual_risk_score:    t.residual_risk_score    ?? null,
        inherent_risk:          Number(t.inherent_risk),
      })),
    };

    const buffer = await renderToBuffer(React.createElement(TreatmentPlanPDF, { data }) as React.ReactElement<any>);
    const filename = `treatment-plan-${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } finally { db.close(); }
}
