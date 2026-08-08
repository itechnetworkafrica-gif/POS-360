import { Router } from "express";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, productsTable, suppliersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

router.get("/purchase-orders", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const orders = await db.select().from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.storeId, storeId))
      .orderBy(purchaseOrdersTable.createdAt);
    const result = await Promise.all(orders.map(async (order) => {
      const items = await db.select().from(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, order.id));
      return {
        ...order, totalCost: parseFloat(order.totalCost),
        items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
      };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list purchase orders");
    res.status(500).json({ error: "Failed to list purchase orders" });
  }
});

router.post("/purchase-orders", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { supplierId, notes, items } = req.body;

    // FK validation
    if (supplierId) {
      const [sup] = await db.select({ id: suppliersTable.id }).from(suppliersTable)
        .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.storeId, storeId)));
      if (!sup) { res.status(422).json({ error: "supplierId does not belong to this store" }); return; }
    }
    for (const item of items || []) {
      const [prod] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
      if (!prod) { res.status(422).json({ error: `Product ${item.productId} does not belong to this store` }); return; }
    }

    let totalCost = 0;
    if (items) { for (const i of items) totalCost += i.quantity * i.unitCost; }
    const [order] = await db.insert(purchaseOrdersTable).values({
      supplierId, storeId, notes, totalCost: String(totalCost), status: "draft",
    }).returning();
    if (items?.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((i: { productId: number; quantity: number; unitCost: number }) => ({
          purchaseOrderId: order.id, productId: i.productId,
          quantity: String(i.quantity), unitCost: String(i.unitCost),
        }))
      );
    }
    const orderItems = await db.select().from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, order.id));
    res.status(201).json({
      ...order, totalCost: parseFloat(order.totalCost),
      items: orderItems.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create purchase order");
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

router.post("/purchase-orders/:id/receive", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [order] = await db.update(purchaseOrdersTable).set({ status: "received" })
      .where(and(eq(purchaseOrdersTable.id, id), eq(purchaseOrdersTable.storeId, storeId))).returning();
    if (!order) { res.status(404).json({ error: "Purchase order not found" }); return; }
    const items = await db.select().from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));
    for (const item of items) {
      const [product] = await db.select().from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
      if (product) {
        const newQty = parseFloat(product.stockQuantity) + parseFloat(item.quantity);
        await db.update(productsTable).set({ stockQuantity: String(newQty) })
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId)));
      }
    }
    res.json({
      ...order, totalCost: parseFloat(order.totalCost),
      items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to receive purchase order");
    res.status(500).json({ error: "Failed to receive purchase order" });
  }
});

export default router;
