import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { DB_PATH } from "@/lib/db-path";

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = getDb();
  try {
    const rows = db.prepare(
      "SELECT module, can_access, can_edit FROM user_permissions WHERE user_id = ?"
    ).all(userId) as { module: string; can_access: number; can_edit: number }[];
    const result: Record<string, { canAccess: boolean; canEdit: boolean }> = {};
    for (const r of rows) result[r.module] = { canAccess: !!r.can_access, canEdit: !!r.can_edit };
    return NextResponse.json(result);
  } finally { db.close(); }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const db = getDb();
  try {
    const { userId, permissions } = await req.json() as {
      userId: number;
      permissions: Record<string, { canAccess: boolean; canEdit: boolean }>;
    };
    if (!userId || !permissions) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO user_permissions (user_id, module, can_access, can_edit, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, module) DO UPDATE SET
        can_access = excluded.can_access,
        can_edit = excluded.can_edit,
        updated_at = excluded.updated_at
    `);

    db.transaction(() => {
      for (const [mod, perm] of Object.entries(permissions)) {
        upsert.run(userId, mod, perm.canAccess ? 1 : 0, perm.canEdit ? 1 : 0, now);
      }
    })();

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
