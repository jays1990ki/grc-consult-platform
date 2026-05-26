/**
 * Single source of truth for the SQLite database file path.
 *
 * DB_PATH env var lets deployment platforms override the default.
 *
 * Local dev  : <project_root>/data/app.db  (auto-created by migrate scripts)
 * Render.com : set  DB_PATH=/data/app.db   (persistent disk mounted at /data)
 *
 * NOTE: This module is intentionally side-effect-free so it is safe to import
 * at Next.js build time.  Directory creation is handled by the startCommand in
 * render.yaml ("mkdir -p …") and by the first migration script at runtime.
 */
import path from "path";

export const DB_PATH: string =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");
