/**
 * v1.3 — Security hardening
 * Adds file_hash (SHA-256) to evidence_files — OWASP A08
 */
import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "../lib/db-path";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const cols = db.pragma("table_info(evidence_files)") as { name: string }[];
if (!cols.some(c => c.name === "file_hash")) {
  db.exec("ALTER TABLE evidence_files ADD COLUMN file_hash TEXT");
  console.log("  + Added file_hash column to evidence_files");
} else {
  console.log("  ✓ file_hash already exists");
}

db.close();
console.log("v1.3 migration complete.");
