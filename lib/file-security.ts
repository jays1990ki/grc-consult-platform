/**
 * Secure file handling helpers — OWASP A08
 *
 * - Magic-byte validation (not extension-only)
 * - UUID-based stored filenames (never use original)
 * - SHA-256 content hash for integrity
 */
import crypto from "crypto";

// ── Types ──────────────────────────────────────────────────────────────────────
export type AllowedFileKind = "pdf" | "png" | "jpg" | "zip";

// Map of kind → allowed MIME types and extensions
export const FILE_KIND_META: Record<AllowedFileKind, { mimes: string[]; exts: string[] }> = {
  pdf: { mimes: ["application/pdf"],                                    exts: [".pdf"] },
  png: { mimes: ["image/png"],                                          exts: [".png"] },
  jpg: { mimes: ["image/jpeg"],                                         exts: [".jpg", ".jpeg"] },
  zip: { mimes: [
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/msword",
    "application/octet-stream",
  ], exts: [".docx", ".xlsx", ".doc", ".xls", ".zip"] },
};

// ── Magic-byte signatures ─────────────────────────────────────────────────────
const SIGNATURES: { kind: AllowedFileKind; bytes: number[] }[] = [
  { kind: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { kind: "png", bytes: [0x89, 0x50, 0x4E, 0x47] }, // PNG
  { kind: "jpg", bytes: [0xFF, 0xD8, 0xFF] },         // JPEG
  { kind: "zip", bytes: [0x50, 0x4B] },               // PK (ZIP, DOCX, XLSX)
];

/**
 * Detect file type from the first few bytes of content.
 * Returns null if the file does not match any allowed signature.
 */
export function detectMagicBytes(buf: Buffer): AllowedFileKind | null {
  for (const { kind, bytes } of SIGNATURES) {
    if (bytes.every((b, i) => buf[i] === b)) return kind;
  }
  return null;
}

/**
 * Validate a file buffer against allowed types.
 * Returns { valid: true, kind } or { valid: false, reason }.
 */
export function validateFileBuffer(
  buf: Buffer,
  maxBytes = 10 * 1024 * 1024
): { valid: true; kind: AllowedFileKind } | { valid: false; reason: string } {
  if (buf.length === 0) {
    return { valid: false, reason: "File is empty" };
  }
  if (buf.length > maxBytes) {
    return {
      valid:  false,
      reason: `File too large (${(buf.length / 1024 / 1024).toFixed(1)} MB; max ${maxBytes / 1024 / 1024} MB)`,
    };
  }
  const kind = detectMagicBytes(buf);
  if (!kind) {
    return {
      valid:  false,
      reason: "Invalid file type. Allowed: PDF, PNG, JPG, DOCX, XLSX",
    };
  }
  return { valid: true, kind };
}

/**
 * Generate a UUID-based stored filename.
 * Format: {uuid}-{timestamp}.{ext}
 * ext is derived from the detected file kind, NOT the original filename.
 */
export function generateStoredFilename(kind: AllowedFileKind): string {
  const uuid      = crypto.randomUUID();
  const timestamp = Date.now();
  const ext       = FILE_KIND_META[kind].exts[0]; // canonical extension
  return `${uuid}-${timestamp}${ext}`;
}

/**
 * Compute SHA-256 hex digest of a buffer.
 */
export function computeSha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
