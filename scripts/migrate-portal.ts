import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    can_access INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT '',
    UNIQUE(user_id, module)
  );
`);

// Seed default permissions for existing users based on role
const now = new Date().toISOString();
const modules = ["assets", "assess", "controls", "executive"];
const users = db.prepare("SELECT id, role FROM users").all() as { id: number; role: string }[];

const upsert = db.prepare(`
  INSERT OR IGNORE INTO user_permissions (user_id, module, can_access, can_edit, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (const user of users) {
    const isAdmin = user.role === "admin";
    const isManager = user.role === "manager";
    const canAccess = 1;
    const canEdit = isAdmin || isManager ? 1 : 0;
    for (const mod of modules) {
      upsert.run(user.id, mod, canAccess, canEdit, now);
    }
  }
})();

console.log(`Portal permissions table created. Seeded defaults for ${users.length} users.`);
db.close();
