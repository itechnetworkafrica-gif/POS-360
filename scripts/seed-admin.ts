/**
 * Gotecx admin account seed script.
 * Idempotent — safe to run multiple times; won't overwrite an existing account.
 *
 * Usage:
 *   DATABASE_URL=... GOTECX_ADMIN_PASSWORD=... pnpm --filter @workspace/api-server exec tsx ../../scripts/seed-admin.ts
 *
 * Required environment variables:
 *   DATABASE_URL           — PostgreSQL connection string (always required)
 *   GOTECX_ADMIN_PASSWORD  — Password to set for itechnetworkafrica@gmail.com
 *
 * The admin account is created with the enterprise plan (all features enabled).
 * The password is hashed with bcrypt before storage; the plain-text value is
 * never persisted anywhere.
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

// ─── Fail-closed validation ────────────────────────────────────────────────────
const DATABASE_URL = process.env["DATABASE_URL"];
const ADMIN_PASSWORD = process.env["GOTECX_ADMIN_PASSWORD"];

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is required");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("ERROR: GOTECX_ADMIN_PASSWORD is required — set it as an environment variable");
  console.error("  Example: GOTECX_ADMIN_PASSWORD=YourSecurePass pnpm run seed-admin");
  process.exit(1);
}

// ─── Minimal inline schema (mirrors lib/db/src/schema) ────────────────────────
const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: text("business_name").notNull().default("My Business"),
  plan: text("plan").notNull().default("starter"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id"),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("NGN"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const ADMIN_EMAIL = "itechnetworkafrica@gmail.com";
const ADMIN_NAME  = "Gotecx Admin";
const ADMIN_BIZ   = "Gotecx (Internal)";
const ADMIN_PLAN  = "enterprise";

async function main() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Check for existing account
    const existing = await db.select({ id: usersTable.id, plan: usersTable.plan })
      .from(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));

    if (existing.length > 0) {
      const user = existing[0];
      if (user.plan !== ADMIN_PLAN) {
        // Upgrade plan if needed
        await db.update(usersTable).set({ plan: ADMIN_PLAN }).where(eq(usersTable.email, ADMIN_EMAIL));
        console.log(`✓ Account already exists — upgraded plan to ${ADMIN_PLAN}`);
      } else {
        console.log(`✓ Account already exists with ${ADMIN_PLAN} plan (id=${user.id}) — no changes made`);
      }
      return;
    }

    // Create the account
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
    const [user] = await db.insert(usersTable).values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      businessName: ADMIN_BIZ,
      plan: ADMIN_PLAN,
      isActive: true,
    }).returning();

    const [store] = await db.insert(storesTable).values({
      ownerId: user.id,
      name: "Gotecx HQ",
      currency: "NGN",
      timezone: "Africa/Lagos",
      isActive: true,
    }).returning();

    console.log("✓ Admin account created:");
    console.log(`  Email    : ${ADMIN_EMAIL}`);
    console.log(`  Plan     : ${ADMIN_PLAN} (all features enabled)`);
    console.log(`  User ID  : ${user.id}`);
    console.log(`  Store ID : ${store.id}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
