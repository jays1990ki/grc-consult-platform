import Database from "better-sqlite3";
import path from "path";

export type AuditAction =
  | "login" | "logout"
  | "create" | "update" | "delete"
  | "disable" | "enable"
  | "permission_update"
  | "upload" | "review";

export type AuditModule =
  | "auth" | "users"
  | "risk_assets" | "risk_assessments" | "controls"
  | "risk_treatments" | "gap_assessments"
  | "bia_processes"
  | "audit_projects" | "evidence_files"
  | "gap_frameworks" | "gap_requirements"
  | "portal_permissions";

export interface AuditEntry {
  userId?:     number;
  userName:    string;
  userEmail:   string;
  action:      AuditAction;
  module:      AuditModule;
  targetId?:   number;
  targetName?: string;
  details?:    string;
  ipAddress?:  string;
}

export function writeLog(entry: AuditEntry): void {
  try {
    const db = new Database(path.join(process.cwd(), "data", "app.db"));
    db.prepare(`
      INSERT INTO activity_logs
        (user_id, user_name, user_email, action, module, target_id, target_name, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.userId    ?? null,
      entry.userName,
      entry.userEmail,
      entry.action,
      entry.module,
      entry.targetId  ?? null,
      entry.targetName ?? null,
      entry.details   ?? null,
      entry.ipAddress ?? null,
      new Date().toISOString(),
    );
    db.close();
  } catch (e) {
    console.error("[audit] Failed to write log:", e);
  }
}

// Helper to get IP from Next.js Request headers
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
