import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/** PATCH /api/admin/frameworks/[id] */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const db = getDb();
  try {
    const body = await req.json() as {
      name?: string;
      version?: string;
      description?: string;
      category?: string;
    };

    const allowed = ["name", "version", "description", "category"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    const bodyMap = body as Record<string, unknown>;

    for (const key of allowed) {
      if (key in bodyMap) {
        sets.push(`${key} = ?`);
        vals.push(bodyMap[key]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    vals.push(id);
    db.prepare(`UPDATE gap_frameworks SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "update", module: "gap_frameworks",
      targetId: id,
      details: `Framework updated: ID ${id} | Fields: ${Object.keys(body).join(", ")}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Framework with this name + version already exists" }, { status: 409 });
    }
    throw e;
  } finally { db.close(); }
}

/** DELETE /api/admin/frameworks/[id] */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const db = getDb();
  try {
    const fw = db.prepare("SELECT name, version FROM gap_frameworks WHERE id = ?").get(id) as any;
    if (!fw) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM gap_frameworks WHERE id = ?").run(id);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "delete", module: "gap_frameworks",
      targetId: id, targetName: `${fw.name} v${fw.version}`,
      details: `Framework deleted: ${fw.name} v${fw.version}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
