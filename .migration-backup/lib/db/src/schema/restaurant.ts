import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const restaurantTablesTable = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity"),
  status: text("status").notNull().default("available"),
  currentTicketId: integer("current_ticket_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  employeeId: integer("employee_id"),
  customerId: integer("customer_id"),
  tableId: integer("table_id"),
  name: text("name"),
  ticketType: text("ticket_type").notNull().default("dine_in"),
  status: text("status").notNull().default("open"),
  subtotal: integer("subtotal").notNull().default(0),
  discountAmount: integer("discount_amount").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketItemsTable = pgTable("ticket_items", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRestaurantTableSchema = createInsertSchema(restaurantTablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRestaurantTable = z.infer<typeof insertRestaurantTableSchema>;
export type RestaurantTable = typeof restaurantTablesTable.$inferSelect;

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;

export const insertTicketItemSchema = createInsertSchema(ticketItemsTable).omit({ id: true, createdAt: true });
export type InsertTicketItem = z.infer<typeof insertTicketItemSchema>;
export type TicketItem = typeof ticketItemsTable.$inferSelect;
