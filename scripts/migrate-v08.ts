/**
 * v0.8 — GAP Analysis tables
 *   gap_frameworks, gap_requirements, gap_assessments
 */
import Database from "better-sqlite3";
import fs from "fs";
import { DB_PATH } from "../lib/db-path";


const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  -- ── Framework registry ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS gap_frameworks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    version     TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(name, version)
  );

  -- ── Requirements per framework ────────────────────────────────────
  CREATE TABLE IF NOT EXISTS gap_requirements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    framework_id     INTEGER NOT NULL REFERENCES gap_frameworks(id) ON DELETE CASCADE,
    requirement_id   TEXT    NOT NULL,
    requirement_name TEXT    NOT NULL,
    domain           TEXT    NOT NULL,
    description      TEXT,
    guidance         TEXT,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    UNIQUE(framework_id, requirement_id)
  );
  CREATE INDEX IF NOT EXISTS idx_gr_fw     ON gap_requirements(framework_id);
  CREATE INDEX IF NOT EXISTS idx_gr_domain ON gap_requirements(domain);

  -- ── Per-org assessment status ─────────────────────────────────────
  CREATE TABLE IF NOT EXISTS gap_assessments (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id    INTEGER NOT NULL DEFAULT 1,
    framework_id       INTEGER NOT NULL REFERENCES gap_frameworks(id),
    requirement_id     INTEGER NOT NULL REFERENCES gap_requirements(id),
    status             TEXT    NOT NULL DEFAULT 'Non-Compliant',
    evidence_reference TEXT,
    comment            TEXT,
    responsible_person TEXT,
    gap_severity       TEXT,
    converted_to_risk  INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT '',
    updated_at         TEXT    NOT NULL DEFAULT '',
    UNIQUE(organization_id, requirement_id)
  );
  CREATE INDEX IF NOT EXISTS idx_ga_org     ON gap_assessments(organization_id);
  CREATE INDEX IF NOT EXISTS idx_ga_fw      ON gap_assessments(framework_id);
  CREATE INDEX IF NOT EXISTS idx_ga_status  ON gap_assessments(status);
  CREATE INDEX IF NOT EXISTS idx_ga_req     ON gap_assessments(requirement_id);
`);

console.log("v0.8 migration complete — GAP analysis tables ready.");
db.close();
