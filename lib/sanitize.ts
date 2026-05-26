/**
 * Input sanitization helpers — OWASP A03
 * Prevents XSS via stored HTML and validates numeric inputs.
 */

// Strip HTML tags and trim; enforce max length
export function sanitizeText(
  input: unknown,
  maxLen = 10_000
): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .trim()
    .slice(0, maxLen);
}

// Sanitize short name fields (50 chars)
export function sanitizeName(input: unknown): string {
  return sanitizeText(input, 500);
}

// Validate and parse integer; returns null if invalid
export function sanitizeInt(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return Math.trunc(n);
}

// Validate and parse float; returns null if invalid
export function sanitizeFloat(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return n;
}

// Validate email format; returns empty string if invalid
export function sanitizeEmail(input: unknown): string {
  const s = sanitizeText(input, 254);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_RE.test(s) ? s.toLowerCase() : "";
}

// Validate a date string (YYYY-MM-DD or ISO); returns null if invalid
export function sanitizeDate(input: unknown): string | null {
  const s = sanitizeText(input, 30);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : s;
}

// Whitelist-based enum validator
export function sanitizeEnum<T extends string>(
  input: unknown,
  allowed: readonly T[],
  fallback?: T
): T | null {
  const s = sanitizeText(input, 100) as T;
  if (allowed.includes(s)) return s;
  return fallback ?? null;
}
