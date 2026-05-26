import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  return db;
}

// GET /api/logs?page=1&limit=50&userId=&action=&module=&search=&from=&to=&ip=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit  = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const userId = searchParams.get("userId")?.trim() || null;
  const action = searchParams.get("action")?.trim() || null;
  const module = searchParams.get("module")?.trim() || null;
  const search = searchParams.get("search")?.trim() || null;
  const ip     = searchParams.get("ip")?.trim()     || null;  // A09: filter by IP
  const from   = searchParams.get("from")?.trim() || null;   // ISO date string
  const to     = searchParams.get("to")?.trim()   || null;

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (userId) { conditions.push("user_id = ?");          params.push(Number(userId)); }
  if (action) { conditions.push("action = ?");           params.push(action); }
  if (module) { conditions.push("module = ?");           params.push(module); }
  if (ip)     { conditions.push("ip_address LIKE ?");    params.push(`%${ip}%`); }
  if (from)   { conditions.push("created_at >= ?");      params.push(from); }
  if (to)     { conditions.push("created_at <= ?");      params.push(to + "T23:59:59.999Z"); }
  if (search) {
    conditions.push("(user_name LIKE ? OR user_email LIKE ? OR target_name LIKE ? OR details LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const db = getDb();
  try {
    const total = (db.prepare(`SELECT COUNT(*) as c FROM activity_logs ${where}`).get(...params) as any).c;

    const rows = db.prepare(`
      SELECT id, user_id, user_name, user_email, action, module,
             target_id, target_name, details, ip_address, created_at
      FROM activity_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return NextResponse.json({ rows, total, page, limit });
  } finally {
    db.close();
  }
}
