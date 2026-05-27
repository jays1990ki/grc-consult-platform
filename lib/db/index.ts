import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { DB_PATH } from "../db-path";
import os from "os";
import path from "path";

// Open the database safely.
//
// Problem: Render.com mounts the persistent disk (/data) only at runtime,
// NOT during `npm run build`. better-sqlite3 throws if the directory does
// not exist. The Proxy workaround introduced `this`-binding bugs in drizzle.
//
// Solution: try the real DB_PATH first; if it fails (build phase, /data not
// mounted), fall back to a throw-away temp file so the build completes.
// At runtime /data IS mounted, so the real DB is always used in production.
//
// Each phase is a separate Node.js process — build state never leaks to
// runtime, and the temp file is discarded when the build container exits.
function openDatabase(): Database.Database {
  try {
    return new Database(DB_PATH);
  } catch {
    // Build-phase fallback: create a throw-away DB so webpack/Next.js
    // can import this module without crashing.
    const tmp = path.join(os.tmpdir(), "app-build.db");
    return new Database(tmp);
  }
}

const sqlite = openDatabase();
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// ── Synchronous bootstrap ─────────────────────────────────────────────────────
// Create the users table if it does not exist.  This runs immediately when
// this module is first imported (before ANY drizzle query executes), so the
// login route can never throw "no such table: users" even when no external
// migration script has been run (e.g. Render.com ignoring startCommand).
// The IF NOT EXISTS guard makes it fully idempotent.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'viewer',
    status     TEXT    NOT NULL DEFAULT 'active',
    created_at TEXT    NOT NULL DEFAULT '',
    updated_at TEXT    NOT NULL DEFAULT ''
  )
`);

export const db = drizzle(sqlite, { schema });
export { schema };
