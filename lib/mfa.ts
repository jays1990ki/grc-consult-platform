/**
 * lib/mfa.ts — TOTP (Time-based One-Time Password) utilities
 * Uses otplib v13 synchronous API.
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator.
 */
import { generateSecret, generateSync, verifySync, generateURI } from "otplib";

/** Generate a new base32-encoded TOTP secret (20 bytes = 160-bit entropy). */
export function generateMfaSecret(): string {
  return generateSecret();
}

/**
 * Verify a 6-digit TOTP code against a stored secret.
 * Accepts codes within ±1 time-step (±30 s) to tolerate clock drift.
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Build the otpauth:// URI for QR-code generation.
 * Encodes issuer, account, and secret so authenticator apps can
 * import the key with a single scan.
 */
export function getMfaOtpauthUrl(email: string, secret: string): string {
  return generateURI({ issuer: "CAT INFONET Admin", label: email, secret });
}
