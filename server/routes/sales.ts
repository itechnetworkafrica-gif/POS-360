import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, customersTable } from "../../db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toSaleJson(s: typeof salesTable.$inferSelect, items: (typeof saleItemsTable.$inferSelect)[]) {
  return {
    ...s,
    subtotal: parseFloat(s.subtotal),
    discountAmount: parseFloat(s.discountAmount),
    taxAmount: parseFloat(s.taxAmount),
    total: parseFloat(s.total),
    items: items.map(i => ({
      ...i,
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
      discount: parseFloat(i.discount),
      taxRate: parseFloat(i.taxRate),
      total: parseFloat(i.total),
    })),
  };
}

router.get("/sales", async (req, res) => {
  try {
    const { storeId, employeeId, customerId, dateFrom, dateTo, status } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    if (employeeId) conditions.push(eq(salesTable.employeeId, parseInt(employeeId as string)));
    if (customerId) conditions.push(eq(salesTable.customerId, parseInt(customerId as string)));
    if (status) conditions.push(eq(salesTable.status, status as string));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) {
      const dt = new Date(dateTo as string);
      dt.setHours(23, 59, 59, 999);
      conditions.push(lte(salesTable.createdAt, dt));
    }
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions)).orderBy(salesTable.createdAt)
      : await db.select().from(salesTable).orderBy(salesTable.createdAt);
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
    const { storeId, employeeId, customerId, tableId, discountAmount, discountPercent, paymentMethod, paymentDetails, total, notes, items } = req.body;
    const receiptNumber = `RCP-${Date.now()}`;
    let subtotal = 0;
    let taxAmt = 0;
    for (const item of items || []) {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
      subtotal += itemTotal;
      taxAmt += itemTotal * ((item.taxRate || 0) / 100);
    }
    const discAmt = discountAmount || (discountPercent ? subtotal * discountPercent / 100 : 0);
    const [sale] = await db.insert(salesTable).values({
      storeId,
      employeeId: employeeId || null,
      customerId: customerId || null,
      tableId: tableId || null,
      subtotal: String(subtotal),
      discountAmount: String(discAmt),
      taxAmount: String(taxAmt),
      total: String(total || (subtotal + taxAmt - discAmt)),
      paymentMethod,
      paymentDetails: paymentDetails || null,
      status: "completed",
      receiptNumber,
      notes: notes || null,
    }).returning();

    if (items && items.length > 0) {
      await db.insert(saleItemsTable).values(
        items.map((item: { productId: number; variantId?: number; productName?: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number }) => {
          const lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
          return {
            saleId: sale.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName || "Unknown",
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            discount: String(item.discount || 0),
            taxRate: String(item.taxRate || 0),
            total: String(lineTotal),
          };
        })
      );
      for (const item of items) {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (product && product.trackStock) {
          const newQty = Math.max(0, parseFloat(product.stockQuantity) - item.quantity);
          await db.update(productsTable).set({ stockQuantity: String(newQty) }).where(eq(productsTable.id, item.productId));
        }
      }
    }

    if (customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
      if (customer) {
        const saleTotal = parseFloat(sale.total);
        const newPoints = parseFloat(customer.loyaltyPoints) + Math.floor(saleTotal);
        const newSpent = parseFloat(customer.totalSpent) + saleTotal;
        await db.update(customersTable).set({
          loyaltyPoints: String(newPoints),
          totalSpent: String(newSpent),
          visitCount: customer.visitCount + 1,
        }).where(eq(customersTable.id, customerId));
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
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
    if (!sale) return res.status(404).json({ error: "Sale not found" });
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
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    const [updated] = await db.update(salesTable).set({ status: "refunded" }).where(eq(salesTable.id, id)).returning();
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    res.json(toSaleJson(updated, items));
  } catch (err) {
    logger.error({ err }, "Failed to refund sale");
    res.status(500).json({ error: "Failed to refund sale" });
  }
});

export default router;
