-- Migration 0002: Add columns introduced during the Replit porting that were
-- absent from the original imported Vercel schema.
--
-- stores.owner_id  — links a store to its owning user (required for tenant isolation).
--                    Nullable so existing stores without an assigned owner continue
--                    to work; the seed-admin script backfills the admin account.
--
-- customers.is_active — soft-delete flag for customers (default TRUE so existing
--                       customer records remain visible after migration).
--
-- Both use IF NOT EXISTS so this migration is safe to run against a database that
-- already has these columns (e.g. the current live database where they were added
-- via ALTER TABLE earlier in the porting process).

ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "owner_id" integer;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
