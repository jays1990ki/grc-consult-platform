/**
 * v1.2 — Framework Management
 * Adds `category` column to gap_frameworks
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Add category column if it doesn't exist
const cols = db.pragma("table_info(gap_frameworks)") as { name: string }[];
if (!cols.some(c => c.name === "category")) {
  db.exec(`
    ALTER TABLE gap_frameworks
    ADD COLUMN category TEXT NOT NULL DEFAULT 'Information Security'
  `);
  console.log("  + Added category column to gap_frameworks");
} else {
  console.log("  ✓ category column already exists");
}

db.close();
console.log("v1.2 migration complete — Framework Management ready.");
