import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
