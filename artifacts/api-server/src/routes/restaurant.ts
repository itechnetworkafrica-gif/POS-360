import { Router } from "express";
import { db, restaurantTablesTable, ticketsTable, ticketItemsTable, employeesTable, customersTable, productsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

function toTicketJson(t: typeof ticketsTable.$inferSelect, items: (typeof ticketItemsTable.$inferSelect)[]) {
  return { ...t, items };
}

// Table management — manager/owner only for mutations
router.get("/tables", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const tables = await db.select().from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.storeId, storeId));
    res.json(tables);
  } catch (err) {
    logger.error({ err }, "Failed to list tables");
    res.status(500).json({ error: "Failed to list tables" });
  }
});

router.post("/tables", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, capacity } = req.body as { name: string; capacity?: number };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [table] = await db.insert(restaurantTablesTable)
      .values({ storeId, name, capacity, status: "available" }).returning();
    res.status(201).json(table);
  } catch (err) {
    logger.error({ err }, "Failed to create table");
    res.status(500).json({ error: "Failed to create table" });
  }
});

router.patch("/tables/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, capacity, status, currentTicketId } = req.body;
    // Validate currentTicketId belongs to this store (prevents cross-tenant ticket association)
    if (currentTicketId != null) {
      const [ticket] = await db.select({ id: ticketsTable.id }).from(ticketsTable)
        .where(and(eq(ticketsTable.id, currentTicketId), eq(ticketsTable.storeId, storeId)));
      if (!ticket) { res.status(422).json({ error: "currentTicketId does not belong to this store" }); return; }
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = capacity;
    if (status !== undefined) updates.status = status;
    if (currentTicketId !== undefined) updates.currentTicketId = currentTicketId;
    const [table] = await db.update(restaurantTablesTable).set(updates)
      .where(and(eq(restaurantTablesTable.id, id), eq(restaurantTablesTable.storeId, storeId))).returning();
    if (!table) { res.status(404).json({ error: "Table not found" }); return; }
    res.json(table);
  } catch (err) {
    logger.error({ err }, "Failed to update table");
    res.status(500).json({ error: "Failed to update table" });
  }
});

router.delete("/tables/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(restaurantTablesTable)
      .where(and(eq(restaurantTablesTable.id, id), eq(restaurantTablesTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete table");
    res.status(500).json({ error: "Failed to delete table" });
  }
});

router.get("/tickets", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { status } = req.query;
    const conditions: SQL[] = [eq(ticketsTable.storeId, storeId)];
    if (status) conditions.push(eq(ticketsTable.status, status as string));
    const tickets = await db.select().from(ticketsTable).where(and(...conditions)).orderBy(ticketsTable.createdAt);
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
    const storeId = getStoreId(req);
    const { employeeId, customerId, tableId, name, ticketType, notes, items } = req.body;

    // FK validation — every related ID must belong to this store
    if (employeeId) {
      const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
        .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.storeId, storeId)));
      if (!emp) { res.status(422).json({ error: "employeeId does not belong to this store" }); return; }
    }
    if (customerId) {
      const [cust] = await db.select({ id: customersTable.id }).from(customersTable)
        .where(and(eq(customersTable.id, customerId), eq(customersTable.storeId, storeId)));
      if (!cust) { res.status(422).json({ error: "customerId does not belong to this store" }); return; }
    }
    if (tableId) {
      const [tbl] = await db.select({ id: restaurantTablesTable.id }).from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.id, tableId), eq(restaurantTablesTable.storeId, storeId)));
      if (!tbl) { res.status(422).json({ error: "tableId does not belong to this store" }); return; }
    }
    for (const item of items || []) {
      const [prod] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
      if (!prod) { res.status(422).json({ error: `Product ${item.productId} does not belong to this store` }); return; }
    }

    let total = 0;
    if (items) { for (const i of items) total += i.quantity * i.unitPrice; }
    const [ticket] = await db.insert(ticketsTable).values({
      storeId, employeeId: employeeId || null, customerId: customerId || null,
      tableId: tableId || null, name: name || null,
      ticketType: ticketType || "dine_in", status: "open",
      total: Math.round(total), subtotal: Math.round(total), notes: notes || null,
    }).returning();
    if (items?.length > 0) {
      await db.insert(ticketItemsTable).values(
        items.map((i: { productId: number; variantId?: number; productName?: string; quantity: number; unitPrice: number; notes?: string }) => ({
          ticketId: ticket.id, productId: i.productId, variantId: i.variantId || null,
          productName: i.productName || "Unknown", quantity: i.quantity,
          unitPrice: Math.round(i.unitPrice * 100), total: Math.round(i.quantity * i.unitPrice * 100),
          notes: i.notes || null, status: "pending",
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
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [ticket] = await db.select().from(ticketsTable)
      .where(and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId)));
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    const items = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, id));
    res.json(toTicketJson(ticket, items));
  } catch (err) {
    logger.error({ err }, "Failed to get ticket");
    res.status(500).json({ error: "Failed to get ticket" });
  }
});

router.patch("/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { status, tableId, customerId, notes } = req.body;
    // Validate changed FKs belong to this store
    if (customerId != null) {
      const [cust] = await db.select({ id: customersTable.id }).from(customersTable)
        .where(and(eq(customersTable.id, customerId), eq(customersTable.storeId, storeId)));
      if (!cust) { res.status(422).json({ error: "customerId does not belong to this store" }); return; }
    }
    if (tableId != null) {
      const [tbl] = await db.select({ id: restaurantTablesTable.id }).from(restaurantTablesTable)
        .where(and(eq(restaurantTablesTable.id, tableId), eq(restaurantTablesTable.storeId, storeId)));
      if (!tbl) { res.status(422).json({ error: "tableId does not belong to this store" }); return; }
    }
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (tableId !== undefined) updates.tableId = tableId;
    if (customerId !== undefined) updates.customerId = customerId;
    if (notes !== undefined) updates.notes = notes;
    const [ticket] = await db.update(ticketsTable).set(updates)
      .where(and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId))).returning();
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    const items = await db.select().from(ticketItemsTable).where(eq(ticketItemsTable.ticketId, id));
    res.json(toTicketJson(ticket, items));
  } catch (err) {
    logger.error({ err }, "Failed to update ticket");
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;
