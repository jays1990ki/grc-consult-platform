import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { calcAssetValue, getRiskLevel } from "@/lib/risk-utils";
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
    const assets = db.prepare(`
      SELECT ra.*,
        (SELECT COUNT(*) FROM risk_assessments WHERE asset_id = ra.id AND organization_id = ra.organization_id) as assessment_count
      FROM risk_assets ra
      WHERE ra.organization_id = ?
      ORDER BY ra.created_at DESC
    `).all(org);
    return NextResponse.json(assets);
  } finally { db.close(); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const org = orgId(req);
  const db  = getDb();
  try {
    const body = await req.json();
    const { name, type, confidentiality, integrity, availability, description, owner } = body;
    if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });

    const c = Number(confidentiality) || 3;
    const i = Number(integrity)       || 3;
    const a = Number(availability)    || 3;
    const assetValue = calcAssetValue(c, i, a);
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO risk_assets
        (organization_id, name, type, confidentiality, integrity, availability, asset_value, description, owner, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(org, name, type, c, i, a, assetValue, description || null, owner || null, now);

    if (session) {
      writeLog({
        userId: session.id, userName: session.name, userEmail: session.email,
        action: "create", module: "risk_assets",
        targetId: Number(result.lastInsertRowid), targetName: name,
        details: `Type: ${type}, AssetValue: ${assetValue}, Org: ${org}`,
        ipAddress: getClientIP(req),
      });
    }

    return NextResponse.json({ id: result.lastInsertRowid, assetValue });
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

    const asset = db.prepare("SELECT name FROM risk_assets WHERE id = ? AND organization_id = ?").get(id, org) as any;
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM risk_assets WHERE id = ? AND organization_id = ?").run(id, org);

    if (session) {
      writeLog({
        userId: session.id, userName: session.name, userEmail: session.email,
        action: "delete", module: "risk_assets",
        targetId: Number(id), targetName: asset.name,
        details: `Org: ${org}`,
        ipAddress: getClientIP(req),
      });
    }

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
