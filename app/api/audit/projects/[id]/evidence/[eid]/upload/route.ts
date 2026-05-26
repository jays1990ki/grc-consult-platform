/**
 * POST /api/audit/projects/[id]/evidence/[eid]/upload
 *
 * OWASP A08 hardening:
 *  - Magic-byte file type detection (not extension-only)
 *  - UUID-based stored filenames (never original filename)
 *  - SHA-256 content hash stored in DB
 *  - 10 MB server-side size limit enforced BEFORE writing to disk
 *
 * OWASP A04:
 *  - Rate limit: 20 uploads per user per hour
 */
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs/promises";
import { getSession } from "@/lib/auth/session";
import { writeLog, getClientIP } from "@/lib/audit";
import { uploadLimiter } from "@/lib/rate-limit";
import {
  validateFileBuffer,
  generateStoredFilename,
  computeSha256,
} from "@/lib/file-security";
import { DB_PATH } from "@/lib/db-path";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function orgId(req: NextRequest) {
  return Number(req.headers.get("x-org-id") ?? new URL(req.url).searchParams.get("orgId") ?? 1);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; eid: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = orgId(req);
  const eid = Number(params.eid);

  // ── A04: Rate limit by user ───────────────────────────────────────────────
  const rl = uploadLimiter.check(`upload:${session.id}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Upload limit reached (20/hour). Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 3600) } }
    );
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.name) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ── A08: Read buffer & enforce size BEFORE writing ────────────────────────
  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer   = Buffer.from(ab);
  } catch {
    return NextResponse.json({ error: "Could not read file data" }, { status: 400 });
  }

  // Validate via magic bytes + size (A08)
  const validation = validateFileBuffer(buffer, MAX_BYTES);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }
  const { kind } = validation;

  // ── A08: UUID filename — never trust original name ────────────────────────
  const storedName = generateStoredFilename(kind);

  // ── A08: SHA-256 hash ─────────────────────────────────────────────────────
  const fileHash = computeSha256(buffer);

  const db = getDb();
  try {
    // Verify evidence request belongs to org
    const ev = db.prepare(
      "SELECT id, evidence_name, audit_project_id FROM evidence_requests WHERE id = ? AND organization_id = ?"
    ).get(eid, org) as any;
    if (!ev) {
      return NextResponse.json({ error: "Evidence request not found" }, { status: 404 });
    }

    // Get next version number
    const maxVer = db.prepare(
      "SELECT MAX(version_number) AS mv FROM evidence_files WHERE evidence_request_id = ?"
    ).get(eid) as any;
    const version = (maxVer?.mv ?? 0) + 1;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "evidence");
    await fs.mkdir(uploadDir, { recursive: true });

    // Write file to disk with UUID name
    await fs.writeFile(path.join(uploadDir, storedName), buffer);

    const now = new Date().toISOString();

    // Insert record — store original_filename for display, storedName for disk
    const result = db.prepare(`
      INSERT INTO evidence_files
        (evidence_request_id, organization_id, original_filename, stored_filename,
         file_size, file_type, uploaded_by, version_number, file_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eid, org,
      file.name,    // original name (display only — never used for disk I/O)
      storedName,   // UUID-based name on disk
      buffer.length,
      file.type || "application/octet-stream",
      session.name,
      version,
      fileHash,
      now,
    );
    const fileId = Number(result.lastInsertRowid);

    // Update evidence_request status → Submitted
    db.prepare(`
      UPDATE evidence_requests SET status = 'Submitted', updated_at = ? WHERE id = ? AND organization_id = ?
    `).run(now, eid, org);

    // A09: Full audit log with IP
    const ip = getClientIP(req);
    writeLog({
      userId:    session.id,
      userName:  session.name,
      userEmail: session.email,
      action:    "upload",
      module:    "evidence_files",
      targetId:  fileId,
      targetName: file.name,
      details:   `File uploaded: "${file.name}" → ${storedName} | v${version} | ${(buffer.length / 1024).toFixed(1)}KB | SHA256: ${fileHash.slice(0, 16)}… | Evidence: ${ev.evidence_name} | IP: ${ip}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      ok:               true,
      fileId,
      version,
      storedFilename:   storedName,
      originalFilename: file.name,
      fileHash,
    }, { status: 201 });

  } finally {
    db.close();
  }
}
