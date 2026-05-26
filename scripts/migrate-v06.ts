/**
 * v0.6 — ISO 27001:2022 Control Library + organizationId isolation
 */
import Database from "better-sqlite3";
import fs from "fs";
import { DB_PATH } from "../lib/db-path";


const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF"); // temporarily off while we alter tables

// ── 1. control_library ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS control_library (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id     INTEGER NOT NULL DEFAULT 1,
    framework           TEXT    NOT NULL DEFAULT 'ISO 27001:2022',
    control_id          TEXT    NOT NULL,
    control_name        TEXT    NOT NULL,
    control_description TEXT,
    domain              TEXT    NOT NULL,
    related_threat      TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(organization_id, framework, control_id)
  );
  CREATE INDEX IF NOT EXISTS idx_cl_org    ON control_library(organization_id);
  CREATE INDEX IF NOT EXISTS idx_cl_ctrl   ON control_library(control_id);
  CREATE INDEX IF NOT EXISTS idx_cl_domain ON control_library(domain);
`);

// ── 2. Add organization_id to risk tables (idempotent via pragma) ───────────
function addColumnIfMissing(table: string, column: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.find(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
    console.log(`  + ${table}.${column} added`);
  } else {
    console.log(`  ✓ ${table}.${column} already exists`);
  }
}

addColumnIfMissing("risk_assets",           "organization_id", "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("risk_assessments",       "organization_id", "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("risk_control_mappings",  "organization_id", "INTEGER NOT NULL DEFAULT 1");

// ── 3. Create indexes for org isolation ────────────────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ra_org    ON risk_assets(organization_id);
  CREATE INDEX IF NOT EXISTS idx_ras_org   ON risk_assessments(organization_id);
  CREATE INDEX IF NOT EXISTS idx_rcm_org   ON risk_control_mappings(organization_id);
`);

db.pragma("foreign_keys = ON");

console.log("v0.6 migration complete.");
db.close();
