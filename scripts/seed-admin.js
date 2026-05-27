/**
 * seed-admin.js  —  plain CommonJS, no tsx, no drizzle-orm
 *
 * Creates the core tables (if they don't exist) and inserts the three default
 * users using INSERT OR IGNORE so re-runs are always safe.
 *
 * Usage:  node scripts/seed-admin.js
 * Env:    DB_PATH  (defaults to <cwd>/data/app.db if not set)
 */

"use strict";

const Database = require("better-sqlite3");
const bcrypt   = require("bcryptjs");
const path     = require("path");
const fs       = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

// Ensure the parent directory exists before opening the DB
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Ensure the users table exists ─────────────────────────────────────────────
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
`);

// ── Seed default users ─────────────────────────────────────────────────────────
async function seedUsers() {
  const now = new Date().toISOString();

  const users = [
    { name: "Admin ME Corp",  email: "admin@mecorp.th",   password: "Admin@1234",   role: "admin"   },
    { name: "Jane Manager",   email: "manager@mecorp.th", password: "Manager@1234", role: "manager" },
    { name: "Tom Viewer",     email: "viewer@mecorp.th",  password: "Viewer@1234",  role: "viewer"  },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
  `);

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const info = stmt.run(u.name, u.email, hash, u.role, now, now);
    if (info.changes > 0) {
      console.log(`  ✓ Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`  – Skipped (already exists): ${u.email}`);
    }
  }
}

seedUsers()
  .then(() => {
    console.log("seed-admin: done.");
    db.close();
  })
  .catch((err) => {
    console.error("seed-admin: FAILED —", err.message);
    db.close();
    process.exit(1);
  });
