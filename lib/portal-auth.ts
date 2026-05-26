// Server-only: uses next/headers via getSession
import Database from "better-sqlite3";
import path from "path";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { ModulePermission, PortalPermissions } from "@/lib/portal-modules";
import { DB_PATH } from "@/lib/db-path";

export type { ModulePermission, PortalPermissions };
export { PORTAL_MODULES } from "@/lib/portal-modules";

export function getUserPermissions(userId: number): PortalPermissions {
  try {
    const db = new Database(DB_PATH);
    const rows = db.prepare(
      "SELECT module, can_access, can_edit FROM user_permissions WHERE user_id = ?"
    ).all(userId) as { module: string; can_access: number; can_edit: number }[];
    db.close();
    const perms: PortalPermissions = {};
    for (const r of rows) {
      perms[r.module] = { canAccess: !!r.can_access, canEdit: !!r.can_edit };
    }
    return perms;
  } catch { return {}; }
}

export async function requirePortalAuth() {
  const session = await getSession();
  if (!session) redirect("/portal/login");
  return session;
}

export async function requireModuleAccess(module: string): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  canEdit: boolean;
  noAccess: boolean;
}> {
  const session = await getSession();
  if (!session) redirect("/portal/login");
  const perms = getUserPermissions(session.id);
  const perm = perms[module];
  return {
    session,
    noAccess: !perm?.canAccess,
    canEdit: !!perm?.canEdit,
  };
}
