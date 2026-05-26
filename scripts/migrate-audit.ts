import Database from "better-sqlite3";
import fs from "fs";
import { DB_PATH } from "../lib/db-path";


const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

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

console.log("Activity logs table ready.");
db.close();
