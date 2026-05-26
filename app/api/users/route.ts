import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== "admin") throw new Error("Admin only");
}

// GET — list all users
export async function GET() {
  const db = getDb();
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at
      FROM users u ORDER BY u.created_at DESC
    `).all();
    return NextResponse.json(users);
  } finally { db.close(); }
}

// POST — create user
export async function POST(req: NextRequest) {
  const session = await getSession();
  try { requireAdmin(session); } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const db = getDb();
  try {
    const { name, email, password, role, permissions } = await req.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, role required" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const now  = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(name, email, hash, role, now, now);

    const newUserId = Number(result.lastInsertRowid);

    // Seed permissions
    const modules = ["assets", "assess", "controls", "executive"];
    const upsert  = db.prepare(`
      INSERT OR IGNORE INTO user_permissions (user_id, module, can_access, can_edit, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    if (permissions) {
      db.transaction(() => {
        for (const mod of modules) {
          const p = permissions[mod] ?? { canAccess: false, canEdit: false };
          upsert.run(newUserId, mod, p.canAccess ? 1 : 0, p.canEdit ? 1 : 0, now);
        }
      })();
    } else {
      // defaults by role
      const canEdit = role === "admin" || role === "manager" ? 1 : 0;
      db.transaction(() => {
        for (const mod of modules) upsert.run(newUserId, mod, 1, canEdit, now);
      })();
    }

    writeLog({
      userId: session!.id, userName: session!.name, userEmail: session!.email,
      action: "create", module: "users",
      targetId: newUserId, targetName: name,
      details: `Role: ${role}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ id: newUserId, ok: true });
  } finally { db.close(); }
}

// PUT — update user
export async function PUT(req: NextRequest) {
  const session = await getSession();
  try { requireAdmin(session); } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const db = getDb();
  try {
    const { id, name, email, password, role, status, permissions } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const now     = new Date().toISOString();
    const changes: string[] = [];

    if (name || email || role || status) {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (name   && name   !== user.name)   changes.push(`name: ${user.name}→${name}`);
      if (email  && email  !== user.email)  changes.push(`email: ${user.email}→${email}`);
      if (role   && role   !== user.role)   changes.push(`role: ${user.role}→${role}`);
      if (status && status !== user.status) changes.push(`status: ${user.status}→${status}`);

      const newHash = password ? await bcrypt.hash(password, 12) : user.password;
      db.prepare(`
        UPDATE users SET
          name = ?, email = ?, password = ?, role = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        name ?? user.name, email ?? user.email, newHash,
        role ?? user.role, status ?? user.status,
        now, id
      );
      if (password) changes.push("password changed");
    }

    // Update permissions
    if (permissions) {
      const upsert = db.prepare(`
        INSERT INTO user_permissions (user_id, module, can_access, can_edit, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, module) DO UPDATE SET
          can_access = excluded.can_access,
          can_edit   = excluded.can_edit,
          updated_at = excluded.updated_at
      `);
      db.transaction(() => {
        for (const [mod, perm] of Object.entries(permissions as Record<string, any>)) {
          upsert.run(id, mod, perm.canAccess ? 1 : 0, perm.canEdit ? 1 : 0, now);
        }
      })();
      changes.push("permissions updated");
    }

    const targetUser = db.prepare("SELECT name FROM users WHERE id = ?").get(id) as any;
    writeLog({
      userId: session!.id, userName: session!.name, userEmail: session!.email,
      action: "update", module: "users",
      targetId: id, targetName: targetUser?.name,
      details: changes.join("; ") || "no changes",
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}

// PATCH — toggle status (disable / enable)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  try { requireAdmin(session); } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const db = getDb();
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const newStatus = user.status === "active" ? "inactive" : "active";
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
      .run(newStatus, new Date().toISOString(), id);

    writeLog({
      userId: session!.id, userName: session!.name, userEmail: session!.email,
      action: newStatus === "inactive" ? "disable" : "enable",
      module: "users",
      targetId: id, targetName: user.name,
      details: `Status changed to ${newStatus}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } finally { db.close(); }
}
