import { Router } from "express";
import { db, restaurantTablesTable, ticketsTable, ticketItemsTable } from "../../db";
import { eq, and, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toTicketJson(t: typeof ticketsTable.$inferSelect, items: (typeof ticketItemsTable.$inferSelect)[]) {
  return { ...t, items };
}

router.get("/tables", async (req, res) => {
  try {
    const { storeId } = req.query;
    const tables = storeId
      ? await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.storeId, parseInt(storeId as string)))
      : await db.select().from(restaurantTablesTable).orderBy(restaurantTablesTable.name);
    res.json(tables);
  } catch (err) {
    logger.error({ err }, "Failed to list tables");
    res.status(500).json({ error: "Failed to list tables" });
  }
});

router.post("/tables", async (req, res) => {
  try {
    const { storeId, name, capacity } = req.body;
    const [table] = await db.insert(restaurantTablesTable).values({ storeId, name, capacity, status: "available" }).returning();
    res.status(201).json(table);
  } catch (err) {
    logger.error({ err }, "Failed to create table");
    res.status(500).json({ error: "Failed to create table" });
  }
});

router.patch("/tables/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, capacity, status, currentTicketId } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = capacity;
    if (status !== undefined) updates.status = status;
    if (currentTicketId !== undefined) updates.currentTicketId = currentTicketId;
    const [table] = await db.update(restaurantTablesTable).set(updates).where(eq(restaurantTablesTable.id, id)).returning();
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json(table);
  } catch (err) {
    logger.error({ err }, "Failed to update table");
    res.status(500).json({ error: "Failed to update table" });
  }
});

router.delete("/tables/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete table");
    res.status(500).json({ error: "Failed to delete table" });
  }
});

router.get("/tickets", async (req, res) => {
  try {
    const { storeId, status } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(ticketsTable.storeId, parseInt(storeId as string)));
    if (status) conditions.push(eq(ticketsTable.status, status as string));
    const tickets = conditions.length > 0
      ? await db.select().from(ticketsTable).where(and(...conditions)).orderBy(ticketsTable.createdAt)
      : await db.select().from(ticketsTable).orderBy(ticketsTable.createdAt);
    const result = await Promise.all(tickets.map(async (t) => {
      const items = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, t.id));
      return toTicketJson(t, items);
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list tickets");
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

router.post("/tickets", async (req, res) => {
  try {
    const { storeId, employeeId, customerId, tableId, name, ticketType, notes, items } = req.body;
    let total = 0;
    if (items) {
      for (const i of items) total += i.quantity * i.unitPrice;
    }
    const [ticket] = await db.insert(ticketsTable).values({
      storeId, employeeId: employeeId || null, customerId: customerId || null,
      tableId: tableId || null, name: name || null,
      ticketType: ticketType || "dine_in", status: "open",
      total: Math.round(total), subtotal: Math.round(total), notes: notes || null,
    }).returning();
    if (items && items.length > 0) {
      await db.insert(ticketItemsTable).values(
        items.map((i: { productId: number; variantId?: number; productName?: string; quantity: number; unitPrice: number; notes?: string }) => ({
          ticketId: ticket.id,
          productId: i.productId,
          variantId: i.variantId || null,
          productName: i.productName || "Unknown",
          quantity: i.quantity,
          unitPrice: Math.round(i.unitPrice * 100),
          total: Math.round(i.quantity * i.unitPrice * 100),
          notes: i.notes || null,
          status: "pending",
        }))
      );
    }
    const ticketItems = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, ticket.id));
    res.status(201).json(toTicketJson(ticket, ticketItems));
  } catch (err) {
    logger.error({ err }, "Failed to create ticket");
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.get("/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const items = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, id));
    res.json(toTicketJson(ticket, items));
  } catch (err) {
    logger.error({ err }, "Failed to get ticket");
    res.status(500).json({ error: "Failed to get ticket" });
  }
});

router.patch("/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, tableId, customerId, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (tableId !== undefined) updates.tableId = tableId;
    if (customerId !== undefined) updates.customerId = customerId;
    if (notes !== undefined) updates.notes = notes;
    const [ticket] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const items = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, id));
    res.json(toTicketJson(ticket, items));
  } catch (err) {
    logger.error({ err }, "Failed to update ticket");
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;
