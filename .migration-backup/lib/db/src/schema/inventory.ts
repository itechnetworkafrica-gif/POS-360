import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  storeId: integer("store_id"),
  status: text("status").notNull().default("draft"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true, createdAt: true });
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
