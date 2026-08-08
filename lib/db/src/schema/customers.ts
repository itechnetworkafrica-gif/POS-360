import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerGroupsTable = pgTable("customer_groups", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id"),              // tenant scope
  name: text("name").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  loyaltyMultiplier: numeric("loyalty_multiplier", { precision: 5, scale: 2 }).notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id"),              // tenant scope
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  birthday: text("birthday"),   // stored as text (ISO date string) to match existing DB column type
  groupId: integer("group_id"),
  loyaltyPoints: numeric("loyalty_points", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  visitCount: integer("visit_count").notNull().default(0),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
