/**
 * Idempotent database migration runner.
 *
 * Uses drizzle-orm's programmatic migrator which:
 * - Tracks applied migrations in a `drizzle.__drizzle_migrations` journal table
 * - Only runs migrations that have not yet been applied
 * - Never drops columns — only adds tables/columns defined in migration files
 *
 * The baseline migration (drizzle/0000_baseline.sql) uses CREATE TABLE IF NOT EXISTS
 * so it is safe to run against a database that already has the full schema
 * (e.g. the original imported database). The journal ensures the baseline is
 * marked as applied and never attempted again.
 *
 * Usage:
 *   pnpm --filter @workspace/db run migrate
 */

import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });

console.log("[migrate] Running database migrations…");

try {
  const db = drizzle(pool);
  await migrate(db, {
    // Migrations folder is ../drizzle relative to src/
    migrationsFolder: path.join(__dirname, "../drizzle"),
  });
  console.log("[migrate] ✓ All migrations applied.");
} catch (err) {
  console.error("[migrate] ✗ Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
