/**
 * lib/db/boot.ts
 *
 * Called ONCE at server startup via instrumentation.ts → register().
 * Creates ALL tables (idempotent — IF NOT EXISTS) and seeds the three
 * default users if they don't yet exist.
 *
 * This makes the app self-initialising: the database is always ready
 * when the first HTTP request arrives, regardless of whether the
 * startCommand ran migrations externally.
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { DB_PATH } from "../db-path";

/** Returns true if `column` exists in `table`. */
function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[];
  return cols.some((c) => c.name === column);
}

/** Returns true if `table` exists in the database. */
function hasTable(db: Database.Database, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table);
  return !!row;
}

export async function bootDatabase(): Promise<void> {
  // Ensure the data directory exists before opening the file
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF"); // off while building schema

  try {
    // ── 1. Core tables (migrate.ts) ───────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        email      TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        role       TEXT    NOT NULL DEFAULT 'viewer',
        status     TEXT    NOT NULL DEFAULT 'active',
        created_at TEXT    NOT NULL DEFAULT '',
        updated_at TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS consultants (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        email      TEXT    NOT NULL UNIQUE,
        phone      TEXT,
        specialty  TEXT    NOT NULL,
        rate       REAL    NOT NULL DEFAULT 0,
        status     TEXT    NOT NULL DEFAULT 'available',
        created_at TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS projects (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT    NOT NULL,
        client_name    TEXT    NOT NULL,
        description    TEXT,
        status         TEXT    NOT NULL DEFAULT 'active',
        start_date     TEXT,
        end_date       TEXT,
        budget         REAL    NOT NULL DEFAULT 0,
        consultant_id  INTEGER REFERENCES consultants(id),
        created_at     TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT    NOT NULL UNIQUE,
        project_id     INTEGER REFERENCES projects(id),
        client_name    TEXT    NOT NULL,
        amount         REAL    NOT NULL DEFAULT 0,
        status         TEXT    NOT NULL DEFAULT 'draft',
        due_date       TEXT,
        issued_date    TEXT,
        created_at     TEXT    NOT NULL DEFAULT ''
      );
    `);

    // ── 2. Risk tables (migrate-risk.ts + migrate-v06 org_id columns) ─────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS risk_assets (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT    NOT NULL,
        type             TEXT    NOT NULL,
        confidentiality  INTEGER NOT NULL DEFAULT 3,
        integrity        INTEGER NOT NULL DEFAULT 3,
        availability     INTEGER NOT NULL DEFAULT 3,
        asset_value      REAL    NOT NULL DEFAULT 3,
        description      TEXT,
        owner            TEXT,
        organization_id  INTEGER NOT NULL DEFAULT 1,
        created_at       TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id        INTEGER NOT NULL REFERENCES risk_assets(id) ON DELETE CASCADE,
        threat_name     TEXT    NOT NULL,
        likelihood      INTEGER NOT NULL DEFAULT 1,
        impact          INTEGER NOT NULL DEFAULT 1,
        inherent_risk   REAL    NOT NULL DEFAULT 0,
        risk_level      TEXT    NOT NULL DEFAULT 'Low',
        notes           TEXT,
        organization_id INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS risk_control_mappings (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id   INTEGER NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
        control_id      TEXT    NOT NULL,
        selected        INTEGER NOT NULL DEFAULT 1,
        organization_id INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT    NOT NULL DEFAULT '',
        UNIQUE(assessment_id, control_id)
      );
    `);

    // ── 3. Activity logs (migrate-audit.ts) ───────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        user_name   TEXT    NOT NULL DEFAULT '',
        user_email  TEXT    NOT NULL DEFAULT '',
        action      TEXT    NOT NULL,
        module      TEXT    NOT NULL,
        target_id   INTEGER,
        target_name TEXT,
        details     TEXT,
        ip_address  TEXT,
        created_at  TEXT    NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_al_user_id    ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_al_created_at ON activity_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_al_action     ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_al_module     ON activity_logs(module);
    `);

    // ── 4. Portal permissions (migrate-portal.ts) ─────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module     TEXT    NOT NULL,
        can_access INTEGER NOT NULL DEFAULT 0,
        can_edit   INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT    NOT NULL DEFAULT '',
        UNIQUE(user_id, module)
      );
    `);

    // ── 5. Control Library (migrate-v06.ts) ───────────────────────────────────
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
      CREATE INDEX IF NOT EXISTS idx_ra_org    ON risk_assets(organization_id);
      CREATE INDEX IF NOT EXISTS idx_ras_org   ON risk_assessments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_rcm_org   ON risk_control_mappings(organization_id);
    `);

    // ── 6. Risk Treatments (migrate-v07.ts) ───────────────────────────────────
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

    // ── 7. GAP Analysis (migrate-v08.ts + migrate-v12 category column) ────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS gap_frameworks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        version     TEXT    NOT NULL,
        description TEXT,
        category    TEXT    NOT NULL DEFAULT 'Information Security',
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, version)
      );
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
      CREATE INDEX IF NOT EXISTS idx_ga_org    ON gap_assessments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_ga_fw     ON gap_assessments(framework_id);
      CREATE INDEX IF NOT EXISTS idx_ga_status ON gap_assessments(status);
      CREATE INDEX IF NOT EXISTS idx_ga_req    ON gap_assessments(requirement_id);
    `);

    // ── 8. BIA tables (migrate-v10.ts) ────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS business_processes (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id   INTEGER NOT NULL DEFAULT 1,
        process_name      TEXT    NOT NULL,
        process_owner     TEXT,
        department        TEXT,
        related_it_system TEXT,
        related_assets    TEXT    NOT NULL DEFAULT '[]',
        priority_level    TEXT    NOT NULL DEFAULT 'Medium',
        mtpd              REAL,
        rto               REAL,
        rpo               REAL,
        status            TEXT    NOT NULL DEFAULT 'Active',
        created_at        TEXT    NOT NULL DEFAULT '',
        updated_at        TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS bia_impact_scores (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        process_id              INTEGER NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
        organization_id         INTEGER NOT NULL DEFAULT 1,
        impact_1h               INTEGER NOT NULL DEFAULT 1,
        impact_4h               INTEGER NOT NULL DEFAULT 1,
        impact_24h              INTEGER NOT NULL DEFAULT 1,
        impact_7d               INTEGER NOT NULL DEFAULT 1,
        financial_impact        INTEGER NOT NULL DEFAULT 1,
        legal_impact            INTEGER NOT NULL DEFAULT 1,
        operational_impact      INTEGER NOT NULL DEFAULT 1,
        reputation_impact       INTEGER NOT NULL DEFAULT 1,
        customer_impact         INTEGER NOT NULL DEFAULT 1,
        financial_loss_per_hour REAL    NOT NULL DEFAULT 0,
        created_at              TEXT    NOT NULL DEFAULT '',
        updated_at              TEXT    NOT NULL DEFAULT '',
        UNIQUE(process_id, organization_id)
      );
    `);

    // ── 9. IT Audit / Evidence Portal (migrate-v11.ts + v13 file_hash) ────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_projects (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL DEFAULT 1,
        project_name    TEXT    NOT NULL,
        framework       TEXT,
        auditor_name    TEXT,
        client_name     TEXT,
        start_date      TEXT,
        end_date        TEXT,
        status          TEXT    NOT NULL DEFAULT 'Planning',
        created_at      TEXT    NOT NULL DEFAULT '',
        updated_at      TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS evidence_requests (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_project_id INTEGER NOT NULL REFERENCES audit_projects(id) ON DELETE CASCADE,
        organization_id  INTEGER NOT NULL DEFAULT 1,
        requirement_id   TEXT,
        evidence_name    TEXT    NOT NULL,
        evidence_description TEXT,
        assigned_owner   TEXT,
        due_date         TEXT,
        status           TEXT    NOT NULL DEFAULT 'Not Submitted',
        created_at       TEXT    NOT NULL DEFAULT '',
        updated_at       TEXT    NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS evidence_files (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        evidence_request_id INTEGER NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
        organization_id     INTEGER NOT NULL DEFAULT 1,
        original_filename   TEXT    NOT NULL,
        stored_filename     TEXT    NOT NULL,
        file_size           INTEGER NOT NULL DEFAULT 0,
        file_type           TEXT    NOT NULL,
        uploaded_by         TEXT    NOT NULL,
        version_number      INTEGER NOT NULL DEFAULT 1,
        auditor_comment     TEXT,
        review_status       TEXT,
        review_date         TEXT,
        file_hash           TEXT,
        created_at          TEXT    NOT NULL DEFAULT ''
      );
    `);

    // ── 10. Idempotent column additions (for DBs upgraded from older versions) ─
    if (hasTable(db, "gap_frameworks") && !hasColumn(db, "gap_frameworks", "category")) {
      db.exec(`ALTER TABLE gap_frameworks ADD COLUMN category TEXT NOT NULL DEFAULT 'Information Security'`);
      console.log("[boot] Added gap_frameworks.category");
    }
    if (hasTable(db, "evidence_files") && !hasColumn(db, "evidence_files", "file_hash")) {
      db.exec(`ALTER TABLE evidence_files ADD COLUMN file_hash TEXT`);
      console.log("[boot] Added evidence_files.file_hash");
    }
    if (hasTable(db, "risk_assets") && !hasColumn(db, "risk_assets", "organization_id")) {
      db.exec(`ALTER TABLE risk_assets ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1`);
      console.log("[boot] Added risk_assets.organization_id");
    }
    if (hasTable(db, "risk_assessments") && !hasColumn(db, "risk_assessments", "organization_id")) {
      db.exec(`ALTER TABLE risk_assessments ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1`);
      console.log("[boot] Added risk_assessments.organization_id");
    }
    if (hasTable(db, "risk_control_mappings") && !hasColumn(db, "risk_control_mappings", "organization_id")) {
      db.exec(`ALTER TABLE risk_control_mappings ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1`);
      console.log("[boot] Added risk_control_mappings.organization_id");
    }

    db.pragma("foreign_keys = ON");
    console.log("[boot] Database schema ready.");

    // ── 11. Seed default users (if not already seeded) ────────────────────────
    const adminExists = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get("admin@mecorp.th");

    if (!adminExists) {
      console.log("[boot] Seeding default users…");
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `);

      const usersToSeed = [
        { name: "Admin ME Corp", email: "admin@mecorp.th",   plain: "Admin@1234",   role: "admin"   },
        { name: "Jane Manager",  email: "manager@mecorp.th", plain: "Manager@1234", role: "manager" },
        { name: "Tom Viewer",    email: "viewer@mecorp.th",  plain: "Viewer@1234",  role: "viewer"  },
      ];

      for (const u of usersToSeed) {
        const hash = await bcrypt.hash(u.plain, 12);
        stmt.run(u.name, u.email, hash, u.role, now, now);
        console.log(`[boot] Created user: ${u.email} (${u.role})`);
      }
    } else {
      console.log("[boot] Default users already exist — skipping seed.");
    }

  } catch (err) {
    // Log but don't crash the server — tables may already be fully set up.
    console.error("[boot] Error during database initialisation:",
      err instanceof Error ? err.message : String(err));
  } finally {
    db.close();
  }
}
