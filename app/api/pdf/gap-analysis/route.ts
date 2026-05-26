import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GapAnalysisPDF, type GapAnalysisData, type DomainStat } from "@/components/pdf/GapAnalysisPDF";
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

function calcScore(rows: { status: string }[]): number {
  const applicable = rows.filter(r => r.status && r.status !== "Not Applicable");
  if (!applicable.length) return 0;
  const pts = applicable.reduce((s, r) => {
    if (r.status === "Compliant")           return s + 100;
    if (r.status === "Partially Compliant") return s + 50;
    return s;
  }, 0);
  return Math.round((pts / (applicable.length * 100)) * 100);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org  = orgId(req);
  const { searchParams } = new URL(req.url);
  const frameworkId = searchParams.get("frameworkId");

  if (!frameworkId) {
    return NextResponse.json({ error: "frameworkId required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const orgName = getOrgName(db, org);
    const now = new Date();
    const generatedAt = now.toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    // Framework info
    const fw = db.prepare("SELECT * FROM gap_frameworks WHERE id = ?").get(frameworkId) as any;
    if (!fw) return NextResponse.json({ error: "Framework not found" }, { status: 404 });

    // All assessments for this framework + org
    const rows = db.prepare(`
      SELECT ga.status, ga.comment, ga.responsible_person, ga.gap_severity, ga.converted_to_risk,
             gr.requirement_id, gr.requirement_name, gr.domain
      FROM gap_requirements gr
      LEFT JOIN gap_assessments ga
        ON ga.requirement_id = gr.id AND ga.organization_id = ?
      WHERE gr.framework_id = ?
      ORDER BY gr.sort_order ASC
    `).all(org, frameworkId) as any[];

    // Counts
    const counts = {
      compliant: rows.filter(r => r.status === "Compliant").length,
      partial:   rows.filter(r => r.status === "Partially Compliant").length,
      nonComp:   rows.filter(r => r.status === "Non-Compliant").length,
      na:        rows.filter(r => r.status === "Not Applicable").length,
      total:     rows.length,
    };

    // Overall score
    const overallScore = calcScore(rows.map(r => ({ status: r.status ?? "" })));

    // Domain stats
    const domains = Array.from(new Set(rows.map((r: any) => r.domain as string)));
    const domainStats: DomainStat[] = domains.map(domain => {
      const dRows = rows.filter((r: any) => r.domain === domain);
      const assessed = dRows.filter((r: any) => r.status).length;
      return {
        domain,
        score:    calcScore(dRows.map((r: any) => ({ status: r.status ?? "" }))),
        assessed,
        total:    dRows.length,
      };
    });

    // Assessment date — use the most recent updated_at, or today
    let assessmentDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    try {
      const latest = db.prepare(
        "SELECT MAX(updated_at) AS d FROM gap_assessments WHERE organization_id = ? AND framework_id = ?"
      ).get(org, frameworkId) as any;
      if (latest?.d) assessmentDate = new Date(latest.d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    } catch { /* keep default */ }

    const gapData: GapAnalysisData = {
      orgName,
      frameworkName:  fw.name,
      assessmentDate,
      generatedAt,
      overallScore,
      domainStats,
      rows: rows.map((r: any) => ({
        requirement_id:    r.requirement_id,
        requirement_name:  r.requirement_name,
        domain:            r.domain,
        status:            r.status ?? "Not Assessed",
        comment:           r.comment ?? null,
        responsible_person: r.responsible_person ?? null,
        gap_severity:      r.gap_severity ?? null,
        converted_to_risk: r.converted_to_risk ?? 0,
      })),
      counts,
    };

    const buffer = await renderToBuffer(React.createElement(GapAnalysisPDF, { data: gapData }) as React.ReactElement<any>);
    const filename = `gap-analysis-${fw.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(buffer.length),
      },
    });
  } finally { db.close(); }
}
