import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "../lib/db-path";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS business_processes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1,
    process_name    TEXT    NOT NULL,
    process_owner   TEXT,
    department      TEXT,
    related_it_system TEXT,
    related_assets  TEXT    NOT NULL DEFAULT '[]',
    priority_level  TEXT    NOT NULL DEFAULT 'Medium',
    mtpd            REAL,
    rto             REAL,
    rpo             REAL,
    status          TEXT    NOT NULL DEFAULT 'Active',
    created_at      TEXT    NOT NULL DEFAULT '',
    updated_at      TEXT    NOT NULL DEFAULT ''
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bia_impact_scores (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id            INTEGER NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
    organization_id       INTEGER NOT NULL DEFAULT 1,
    impact_1h             INTEGER NOT NULL DEFAULT 1,
    impact_4h             INTEGER NOT NULL DEFAULT 1,
    impact_24h            INTEGER NOT NULL DEFAULT 1,
    impact_7d             INTEGER NOT NULL DEFAULT 1,
    financial_impact      INTEGER NOT NULL DEFAULT 1,
    legal_impact          INTEGER NOT NULL DEFAULT 1,
    operational_impact    INTEGER NOT NULL DEFAULT 1,
    reputation_impact     INTEGER NOT NULL DEFAULT 1,
    customer_impact       INTEGER NOT NULL DEFAULT 1,
    financial_loss_per_hour REAL NOT NULL DEFAULT 0,
    created_at            TEXT    NOT NULL DEFAULT '',
    updated_at            TEXT    NOT NULL DEFAULT '',
    UNIQUE(process_id, organization_id)
  );
`);

db.close();
console.log("v1.0 migration complete — BIA tables ready.");
