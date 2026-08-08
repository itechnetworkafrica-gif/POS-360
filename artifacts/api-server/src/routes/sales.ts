import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, customersTable, employeesTable, restaurantTablesTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

function toSaleJson(s: typeof salesTable.$inferSelect, items: (typeof saleItemsTable.$inferSelect)[]) {
  return {
    ...s,
    subtotal: parseFloat(s.subtotal), discountAmount: parseFloat(s.discountAmount),
    taxAmount: parseFloat(s.taxAmount), total: parseFloat(s.total),
    items: items.map(i => ({
      ...i, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice),
      discount: parseFloat(i.discount), taxRate: parseFloat(i.taxRate), total: parseFloat(i.total),
    })),
  };
}

/** Reject with 422 if the given ID does not belong to storeId in the specified table/column. */
async function requireBelongsToStore(
  table: typeof employeesTable | typeof customersTable | typeof restaurantTablesTable | typeof productsTable,
  id: number,
  storeId: number,
  label: string,
  res: Parameters<Parameters<typeof router.post>[1]>[1],
): Promise<boolean> {
  // Use a raw select with storeId filter for all tables that have store_id
  const [row] = await (db as typeof db).select({ id: (table as typeof employeesTable).id })
    .from(table as typeof employeesTable)
    .where(and(
      eq((table as typeof employeesTable).id, id),
      eq((table as typeof employeesTable).storeId as typeof employeesTable["storeId"], storeId),
    ));
  if (!row) {
    res.status(422).json({ error: `${label} does not belong to this store` });
    return false;
  }
  return true;
}

router.get("/sales", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { employeeId, customerId, dateFrom, dateTo, status } = req.query;
    const conditions: SQL[] = [eq(salesTable.storeId, storeId)];
    if (employeeId) conditions.push(eq(salesTable.employeeId, parseInt(employeeId as string)));
    if (customerId) conditions.push(eq(salesTable.customerId, parseInt(customerId as string)));
    if (status) conditions.push(eq(salesTable.status, status as string));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) {
      const dt = new Date(dateTo as string); dt.setHours(23, 59, 59, 999);
      conditions.push(lte(salesTable.createdAt, dt));
    }
    const sales = await db.select().from(salesTable).where(and(...conditions)).orderBy(salesTable.createdAt);
    const result = await Promise.all(sales.map(async (sale) => {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      return toSaleJson(sale, items);
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list sales");
    res.status(500).json({ error: "Failed to list sales" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { employeeId, customerId, tableId, discountAmount, discountPercent,
            paymentMethod, paymentDetails, total, notes, items } = req.body;

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
    // Validate each line-item product belongs to this store
    for (const item of items || []) {
      const [prod] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
      if (!prod) { res.status(422).json({ error: `Product ${item.productId} does not belong to this store` }); return; }
    }

    const receiptNumber = `RCP-${Date.now()}`;
    let subtotal = 0; let taxAmt = 0;
    for (const item of items || []) {
      const lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
      subtotal += lineTotal;
      taxAmt += lineTotal * ((item.taxRate || 0) / 100);
    }
    const discAmt = discountAmount || (discountPercent ? subtotal * discountPercent / 100 : 0);
    const [sale] = await db.insert(salesTable).values({
      storeId, employeeId: employeeId || null, customerId: customerId || null, tableId: tableId || null,
      subtotal: String(subtotal), discountAmount: String(discAmt), taxAmount: String(taxAmt),
      total: String(total || (subtotal + taxAmt - discAmt)),
      paymentMethod, paymentDetails: paymentDetails || null, status: "completed",
      receiptNumber, notes: notes || null,
    }).returning();

    if (items?.length > 0) {
      await db.insert(saleItemsTable).values(
        items.map((item: { productId: number; variantId?: number; productName?: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number }) => ({
          saleId: sale.id, productId: item.productId, variantId: item.variantId || null,
          productName: item.productName || "Unknown", quantity: String(item.quantity),
          unitPrice: String(item.unitPrice), discount: String(item.discount || 0),
          taxRate: String(item.taxRate || 0),
          total: String(item.quantity * item.unitPrice - (item.discount || 0)),
        }))
      );
      for (const item of items) {
        const [product] = await db.select().from(productsTable)
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
        if (product?.trackStock) {
          const newQty = Math.max(0, parseFloat(product.stockQuantity) - item.quantity);
          await db.update(productsTable).set({ stockQuantity: String(newQty) })
            .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
        }
      }
    }

    if (customerId) {
      const [customer] = await db.select().from(customersTable)
        .where(and(eq(customersTable.id, customerId), eq(customersTable.storeId, storeId)));
      if (customer) {
        await db.update(customersTable).set({
          loyaltyPoints: String(parseFloat(customer.loyaltyPoints) + Math.floor(parseFloat(sale.total))),
          totalSpent: String(parseFloat(customer.totalSpent) + parseFloat(sale.total)),
          visitCount: customer.visitCount + 1,
        }).where(and(eq(customersTable.id, customerId), eq(customersTable.storeId, storeId)));
      }
    }

    const saleItems = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
    res.status(201).json(toSaleJson(sale, saleItems));
  } catch (err) {
    logger.error({ err }, "Failed to create sale");
    res.status(500).json({ error: "Failed to create sale" });
  }
});

router.get("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req);
    const [sale] = await db.select().from(salesTable)
      .where(and(eq(salesTable.id, id), eq(salesTable.storeId, storeId)));
    if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    res.json(toSaleJson(sale, items));
  } catch (err) {
    logger.error({ err }, "Failed to get sale");
    res.status(500).json({ error: "Failed to get sale" });
  }
});

router.post("/sales/:id/refund", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req);
    const where = and(eq(salesTable.id, id), eq(salesTable.storeId, storeId));
    const [sale] = await db.select().from(salesTable).where(where);
    if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }
    const [updated] = await db.update(salesTable).set({ status: "refunded" }).where(where).returning();
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    res.json(toSaleJson(updated, items));
  } catch (err) {
    logger.error({ err }, "Failed to refund sale");
    res.status(500).json({ error: "Failed to refund sale" });
  }
});

export default router;
