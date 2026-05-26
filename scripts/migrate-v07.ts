/**
 * v0.7 — Risk Treatment Plan table
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS risk_treatments (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id                INTEGER NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    organization_id        INTEGER NOT NULL DEFAULT 1,
    treatment_option       TEXT    NOT NULL DEFAULT 'Mitigate',
    action_plan            TEXT,
    owner                  TEXT,
    due_date               TEXT,
    budget                 REAL,
    expected_residual_risk REAL,
    residual_risk_score    REAL,
    status                 TEXT    NOT NULL DEFAULT 'To Do',
    created_at             TEXT    NOT NULL DEFAULT '',
    updated_at             TEXT    NOT NULL DEFAULT '',
    UNIQUE(organization_id, risk_id)
  );

  CREATE INDEX IF NOT EXISTS idx_rt_org    ON risk_treatments(organization_id);
  CREATE INDEX IF NOT EXISTS idx_rt_risk   ON risk_treatments(risk_id);
  CREATE INDEX IF NOT EXISTS idx_rt_status ON risk_treatments(status);
  CREATE INDEX IF NOT EXISTS idx_rt_owner  ON risk_treatments(owner);
`);

console.log("v0.7 migration complete — risk_treatments table ready.");
db.close();
