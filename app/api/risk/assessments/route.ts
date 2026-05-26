import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { calcInherentRisk, getRiskLevel } from "@/lib/risk-utils";
import { writeLog, getClientIP } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function orgId(req: NextRequest): number {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

export async function GET(req: NextRequest) {
  const org = orgId(req);
  const db  = getDb();
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId");

    const rows = assetId
      ? db.prepare(`
          SELECT ra.*, ras.name as asset_name, ras.type as asset_type
          FROM risk_assessments ra
          JOIN risk_assets ras ON ras.id = ra.asset_id
          WHERE ra.asset_id = ? AND ra.organization_id = ?
          ORDER BY ra.created_at DESC
        `).all(assetId, org)
      : db.prepare(`
          SELECT ra.*, ras.name as asset_name, ras.type as asset_type
          FROM risk_assessments ra
          JOIN risk_assets ras ON ras.id = ra.asset_id
          WHERE ra.organization_id = ?
          ORDER BY ra.inherent_risk DESC
        `).all(org);

    return NextResponse.json(rows);
  } finally { db.close(); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json();
    const { assetId, threatName, likelihood, impact, notes } = body;
    if (!assetId || !threatName) {
      return NextResponse.json({ error: "assetId and threatName required" }, { status: 400 });
    }

    const asset = db.prepare(
      "SELECT asset_value FROM risk_assets WHERE id = ? AND organization_id = ?"
    ).get(assetId, org) as { asset_value: number } | undefined;
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const l = Number(likelihood) || 1;
    const i = Number(impact)     || 1;
    const inherentRisk = calcInherentRisk(l, i, asset.asset_value);
    const riskLevel    = getRiskLevel(inherentRisk);
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO risk_assessments
        (organization_id, asset_id, threat_name, likelihood, impact, inherent_risk, risk_level, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(org, assetId, threatName, l, i, inherentRisk, riskLevel, notes || null, now);

    if (session) {
      writeLog({
        userId: session.id, userName: session.name, userEmail: session.email,
        action: "create", module: "risk_assessments",
        targetId: Number(result.lastInsertRowid), targetName: threatName,
        details: `Level: ${riskLevel}, Score: ${inherentRisk}, Org: ${org}`,
        ipAddress: getClientIP(req),
      });
    }

    return NextResponse.json({ id: result.lastInsertRowid, inherentRisk, riskLevel });
  } finally { db.close(); }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const org = orgId(req);
  const db  = getDb();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const row = db.prepare(
      "SELECT threat_name FROM risk_assessments WHERE id = ? AND organization_id = ?"
    ).get(id, org) as any;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM risk_assessments WHERE id = ? AND organization_id = ?").run(id, org);

    if (session) {
      writeLog({
        userId: session.id, userName: session.name, userEmail: session.email,
        action: "delete", module: "risk_assessments",
        targetId: Number(id), targetName: row.threat_name,
        details: `Org: ${org}`,
        ipAddress: getClientIP(req),
      });
    }

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
