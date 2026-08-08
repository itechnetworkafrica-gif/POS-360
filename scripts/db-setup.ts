#!/usr/bin/env tsx
/**
 * db-setup.ts — Idempotent database setup and migration runner.
 *
 * Runs the versioned drizzle-orm migrator (pnpm --filter @workspace/db run migrate)
 * which applies only unapplied migrations and never drops columns.
 *
 * Optionally backfills store_id on any tenant records that were created before
 * the column was added (all three tables now have the column; this assigns
 * orphaned rows to the first available store so data is not left dangling).
 *
 * Usage (development or CI):
 *   pnpm --filter @workspace/scripts run db-setup
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("🔧 Gotecx POS — running versioned database migrations...");
execSync("pnpm --filter @workspace/db run migrate", {
  stdio: "inherit",
  cwd: root,
});
console.log("✅ Migrations complete.");

// Backfill orphaned tenant records
console.log("🔧 Checking for orphaned tenant records to backfill...");

// Dynamic import so we only load the DB after the schema is confirmed to exist
const { db, storesTable, customersTable, customerGroupsTable, suppliersTable } = await import("@workspace/db");
const { isNull } = await import("drizzle-orm");

const stores = await db.select({ id: storesTable.id }).from(storesTable).limit(1);
if (stores.length === 0) {
  console.log("ℹ️  No stores found — skipping backfill (fresh deployment, no orphaned rows possible).");
} else {
  const defaultStoreId = stores[0]!.id;
  console.log(`  Using store ID ${defaultStoreId} as backfill target for orphaned rows.`);

  const [custResult] = await db.update(customersTable)
    .set({ storeId: defaultStoreId })
    .where(isNull(customersTable.storeId))
    .returning({ id: customersTable.id });
  if (custResult) console.log("  ↳ Backfilled customers with null store_id.");

  const [grpResult] = await db.update(customerGroupsTable)
    .set({ storeId: defaultStoreId })
    .where(isNull(customerGroupsTable.storeId))
    .returning({ id: customerGroupsTable.id });
  if (grpResult) console.log("  ↳ Backfilled customer_groups with null store_id.");

  const [supResult] = await db.update(suppliersTable)
    .set({ storeId: defaultStoreId })
    .where(isNull(suppliersTable.storeId))
    .returning({ id: suppliersTable.id });
  if (supResult) console.log("  ↳ Backfilled suppliers with null store_id.");

  console.log("✅ Backfill complete.");
}
