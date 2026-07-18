import { Router } from "express";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, productsTable } from "../../db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/purchase-orders", async (req, res) => {
  try {
    const orders = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);
    const result = await Promise.all(orders.map(async (o) => {
      const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, o.id));
      return {
        ...o,
        totalCost: parseFloat(o.totalCost),
        items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
      };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list purchase orders");
    res.status(500).json({ error: "Failed to list purchase orders" });
  }
});

router.post("/purchase-orders", async (req, res) => {
  try {
    const { supplierId, storeId, notes, items } = req.body;
    const totalCost = (items || []).reduce((sum: number, i: { quantity: number; unitCost: number }) => sum + (i.quantity * i.unitCost), 0);
    const [order] = await db.insert(purchaseOrdersTable).values({
      supplierId, storeId, notes, totalCost: String(totalCost), status: "draft",
    }).returning();
    if (items && items.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((i: { productId: number; quantity: number; unitCost: number }) => ({
          purchaseOrderId: order.id,
          productId: i.productId,
          quantity: String(i.quantity),
          unitCost: String(i.unitCost),
        }))
      );
    }
    const orderItems = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, order.id));
    res.status(201).json({
      ...order,
      totalCost: parseFloat(order.totalCost),
      items: orderItems.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create purchase order");
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

router.post("/purchase-orders/:id/receive", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db.update(purchaseOrdersTable).set({ status: "received" }).where(eq(purchaseOrdersTable.id, id)).returning();
    if (!order) return res.status(404).json({ error: "Purchase order not found" });
    const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
    for (const item of items) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      if (product) {
        const newQty = parseFloat(product.stockQuantity) + parseFloat(item.quantity);
        await db.update(productsTable).set({ stockQuantity: String(newQty) }).where(eq(productsTable.id, item.productId));
      }
    }
    res.json({
      ...order,
      totalCost: parseFloat(order.totalCost),
      items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to receive purchase order");
    res.status(500).json({ error: "Failed to receive purchase order" });
  }
});

export default router;
