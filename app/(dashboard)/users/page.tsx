import Database from "better-sqlite3";
import path from "path";
import UsersTable from "@/components/admin/UsersTable";
import { DB_PATH } from "@/lib/db-path";

function getUsers() {
  try {
    const db = new Database(DB_PATH);
    const rows = db.prepare(`
      SELECT id, name, email, role, status, created_at
      FROM users ORDER BY created_at DESC
    `).all() as any[];
    db.close();
    return rows;
  } catch { return []; }
}

export default function UsersPage() {
  const users = getUsers();
  return (
    <div className="space-y-2">
      <UsersTable initialUsers={users} />
    </div>
  );
}
