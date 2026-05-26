import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";

function getDb() {
  const db = new Database(path.join(process.cwd(), "data", "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

/** GET /api/audit/projects/[id]/evidence/[eid] */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; eid: string } }
) {
  const org = orgId(req);
  const eid = Number(params.eid);
  const db  = getDb();
  try {
    const evidence = db.prepare(
      "SELECT * FROM evidence_requests WHERE id = ? AND organization_id = ?"
    ).get(eid, org);
    if (!evidence) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const files = db.prepare(`
      SELECT * FROM evidence_files
      WHERE evidence_request_id = ?
      ORDER BY version_number DESC
    `).all(eid);

    return NextResponse.json({ evidence, files });
  } finally { db.close(); }
}

/** PATCH /api/audit/projects/[id]/evidence/[eid] — update status / auditor review */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; eid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const eid = Number(params.eid);
  const db  = getDb();
  try {
    const body = await req.json() as {
      status?: string;
      assigned_owner?: string;
      due_date?: string;
      evidence_description?: string;
      auditor_comment?: string;   // stored on latest file record + request
      review_date?: string;
    };

    const ev = db.prepare(
      "SELECT * FROM evidence_requests WHERE id = ? AND organization_id = ?"
    ).get(eid, org) as any;
    if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date().toISOString();
    const allowed = ["status", "assigned_owner", "due_date", "evidence_description"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    const bodyMap = body as Record<string, unknown>;

    for (const key of allowed) {
      if (key in bodyMap) {
        sets.push(`${key} = ?`);
        vals.push(bodyMap[key]);
      }
    }
    sets.push("updated_at = ?");
    vals.push(now, eid, org);

    db.prepare(`
      UPDATE evidence_requests SET ${sets.join(", ")} WHERE id = ? AND organization_id = ?
    `).run(...vals);

    // If auditor comment / review provided → update the latest file record too
    if (body.auditor_comment !== undefined || body.review_date !== undefined) {
      const latestFile = db.prepare(`
        SELECT id FROM evidence_files
        WHERE evidence_request_id = ?
        ORDER BY version_number DESC LIMIT 1
      `).get(eid) as any;

      if (latestFile) {
        db.prepare(`
          UPDATE evidence_files
          SET auditor_comment = ?, review_status = ?, review_date = ?
          WHERE id = ?
        `).run(
          body.auditor_comment ?? null,
          body.status ?? null,
          body.review_date ?? now,
          latestFile.id,
        );
      }
    }

    // If status = 'Fail' → auto-create gap_assessment entry
    let gapCreated = false;
    if (body.status === "Fail" && ev.requirement_id) {
      const reqId = Number(ev.requirement_id);
      if (!isNaN(reqId) && reqId > 0) {
        try {
          const gapReq = db.prepare(
            "SELECT id, framework_id FROM gap_requirements WHERE id = ?"
          ).get(reqId) as any;

          if (gapReq) {
            // Get project name for notes
            const proj = db.prepare(
              "SELECT project_name FROM audit_projects WHERE id = ?"
            ).get(ev.audit_project_id) as any;

            db.prepare(`
              INSERT INTO gap_assessments
                (organization_id, framework_id, requirement_id, status,
                 comment, created_at, updated_at)
              VALUES (?, ?, ?, 'Non-Compliant', ?, ?, ?)
              ON CONFLICT(organization_id, requirement_id) DO UPDATE SET
                status     = 'Non-Compliant',
                comment    = excluded.comment,
                updated_at = excluded.updated_at
            `).run(
              org, gapReq.framework_id, reqId,
              `Auto-flagged from IT Audit: ${proj?.project_name ?? "N/A"} — Evidence: ${ev.evidence_name}`,
              now, now,
            );
            gapCreated = true;
          }
        } catch { /* gap table may not exist for this requirement */ }
      }
    }

    const action = body.status ? "review" : "update";
    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action, module: "evidence_files",
      targetId: eid, targetName: ev.evidence_name,
      details: `Evidence ${action}: ${ev.evidence_name} → ${body.status ?? "updated"} | Project: ${ev.audit_project_id} | Org: ${org}${gapCreated ? " | GAP entry auto-created" : ""}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true, gapCreated });
  } finally { db.close(); }
}

/** DELETE /api/audit/projects/[id]/evidence/[eid] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; eid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = orgId(req);
  const eid = Number(params.eid);
  const db  = getDb();
  try {
    const ev = db.prepare(
      "SELECT evidence_name FROM evidence_requests WHERE id = ? AND organization_id = ?"
    ).get(eid, org) as any;
    if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

    db.prepare("DELETE FROM evidence_requests WHERE id = ? AND organization_id = ?").run(eid, org);

    writeLog({
      userId: session.id, userName: session.name, userEmail: session.email,
      action: "delete", module: "audit_projects",
      targetId: eid, targetName: ev.evidence_name,
      details: `Evidence request deleted: ${ev.evidence_name} | Org: ${org}`,
      ipAddress: getClientIP(req),
    });

    return NextResponse.json({ ok: true });
  } finally { db.close(); }
}
