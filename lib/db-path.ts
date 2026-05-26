/**
 * Single source of truth for the SQLite database file path.
 *
 * DB_PATH env var lets deployment platforms override the default.
 *
 * Local dev  : <project_root>/data/app.db  (auto-created if absent)
 * Render.com : set  DB_PATH=/data/app.db   (persistent disk mounted at /data)
 */
import path from "path";
import fs from "fs";

const resolved: string =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");

// Ensure the parent directory exists so any consumer can connect without
// first checking — idempotent, no-op if it already exists.
const dir = path.dirname(resolved);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const DB_PATH = resolved;
