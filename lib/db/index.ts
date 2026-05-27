import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { DB_PATH } from "../db-path";

// Lazy singleton — defers `new Database()` until the first actual DB call.
// This prevents better-sqlite3 from crashing at Next.js build time on
// Render.com, where the persistent disk (/data) is only mounted at runtime.
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _sqlite = new Database(DB_PATH);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

// Re-export a Proxy so callers keep the exact same `db.select(...)` API
// without any changes — the real connection is opened on first property access.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export { schema };
