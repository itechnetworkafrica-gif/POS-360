-- Migration 0001: Add store_id to tenant-scoped tables that were missing it.
-- Enables row-level tenant isolation for customers, customer_groups, and suppliers.
-- Uses ADD COLUMN IF NOT EXISTS so this is safe to run against an imported database
-- that already has these columns from the original ALTER TABLE commands.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "store_id" integer;
--> statement-breakpoint
ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "store_id" integer;
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "store_id" integer;
