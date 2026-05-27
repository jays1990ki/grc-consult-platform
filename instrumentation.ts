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
  // NEXT_RUNTIME is 'edge' in the Edge runtime, 'nodejs' in the Node.js
  // server runtime, and may be undefined in some Next.js 14 configurations.
  // We run the boot in every context EXCEPT Edge (which has no Node.js APIs).
  console.log(
    "[instrumentation] register() called — NEXT_RUNTIME:",
    process.env.NEXT_RUNTIME ?? "(undefined)"
  );

  if (process.env.NEXT_RUNTIME !== "edge") {
    // Dynamic import keeps better-sqlite3 out of the client/edge bundle.
    const { bootDatabase } = await import("./lib/db/boot");
    await bootDatabase();
  }
}
