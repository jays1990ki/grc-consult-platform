import Database from "better-sqlite3";
import fs from "fs";
import { DB_PATH } from "../lib/db-path";


const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS risk_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    confidentiality INTEGER NOT NULL DEFAULT 3,
    integrity INTEGER NOT NULL DEFAULT 3,
    availability INTEGER NOT NULL DEFAULT 3,
    asset_value REAL NOT NULL DEFAULT 3,
    description TEXT,
    owner TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES risk_assets(id) ON DELETE CASCADE,
    threat_name TEXT NOT NULL,
    likelihood INTEGER NOT NULL DEFAULT 1,
    impact INTEGER NOT NULL DEFAULT 1,
    inherent_risk REAL NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'Low',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS risk_control_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL,
    selected INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '',
    UNIQUE(assessment_id, control_id)
  );
`);

console.log("Risk module schema created/updated successfully!");
db.close();
