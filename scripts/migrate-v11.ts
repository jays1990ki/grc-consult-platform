import Database from "better-sqlite3";
import path from "path";
import { DB_PATH } from "../lib/db-path";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1,
    project_name    TEXT NOT NULL,
    framework       TEXT,
    auditor_name    TEXT,
    client_name     TEXT,
    start_date      TEXT,
    end_date        TEXT,
    status          TEXT NOT NULL DEFAULT 'Planning',
    created_at      TEXT NOT NULL DEFAULT '',
    updated_at      TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS evidence_requests (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_project_id INTEGER NOT NULL REFERENCES audit_projects(id) ON DELETE CASCADE,
    organization_id  INTEGER NOT NULL DEFAULT 1,
    requirement_id   TEXT,
    evidence_name    TEXT NOT NULL,
    evidence_description TEXT,
    assigned_owner   TEXT,
    due_date         TEXT,
    status           TEXT NOT NULL DEFAULT 'Not Submitted',
    created_at       TEXT NOT NULL DEFAULT '',
    updated_at       TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS evidence_files (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_request_id INTEGER NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
    organization_id     INTEGER NOT NULL DEFAULT 1,
    original_filename   TEXT NOT NULL,
    stored_filename     TEXT NOT NULL,
    file_size           INTEGER NOT NULL DEFAULT 0,
    file_type           TEXT NOT NULL,
    uploaded_by         TEXT NOT NULL,
    version_number      INTEGER NOT NULL DEFAULT 1,
    auditor_comment     TEXT,
    review_status       TEXT,
    review_date         TEXT,
    created_at          TEXT NOT NULL DEFAULT ''
  );
`);

db.close();
console.log("v1.1 migration complete — IT Audit Evidence Portal tables ready.");
