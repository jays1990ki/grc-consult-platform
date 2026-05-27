/**
 * instrumentation.ts — Next.js server startup hook
 *
 * Next.js calls register() ONCE when the server process starts
 * (i.e. when `next start` runs), before any HTTP requests are handled.
 *
 * We use this to ensure the SQLite database and all tables exist and
 * the default admin users are seeded — regardless of whether the
 * external startCommand ran the migration scripts.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js server runtime, not Edge or build phase.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import so webpack doesn't try to bundle better-sqlite3
    // into the client bundle during `next build`.
    const { bootDatabase } = await import("./lib/db/boot");
    await bootDatabase();
  }
}
