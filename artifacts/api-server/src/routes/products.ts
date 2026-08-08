import { Router } from "express";
import { db, productsTable, productVariantsTable, categoriesTable, suppliersTable } from "@workspace/db";
import { eq, and, ilike, SQL } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

function toProductJson(p: typeof productsTable.$inferSelect) {
  return {
    ...p, price: parseFloat(p.price),
    cost: p.cost !== null ? parseFloat(p.cost) : null,
    taxRate: p.taxRate !== null ? parseFloat(p.taxRate) : null,
    stockQuantity: parseFloat(p.stockQuantity),
    lowStockThreshold: p.lowStockThreshold !== null ? parseFloat(p.lowStockThreshold) : null,
  };
}

router.get("/products", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { categoryId, search, lowStock } = req.query;
    const conditions: SQL[] = [eq(productsTable.storeId, storeId)];
    if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId as string)));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    const products = await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.name);
    let result = products.map(toProductJson);
    if (lowStock === "true") {
      result = result.filter(p => p.lowStockThreshold !== null && p.stockQuantity <= p.lowStockThreshold);
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Failed to list products" });
  }
});

router.post("/products", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, description, sku, barcode, price, cost, taxRate, stockQuantity,
            lowStockThreshold, trackStock, imageUrl, categoryId, supplierId } = req.body;

    // FK validation — category and supplier must belong to this store
    if (categoryId) {
      const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable)
        .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.storeId, storeId)));
      if (!cat) { res.status(422).json({ error: "categoryId does not belong to this store" }); return; }
    }
    if (supplierId) {
      const [sup] = await db.select({ id: suppliersTable.id }).from(suppliersTable)
        .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.storeId, storeId)));
      if (!sup) { res.status(422).json({ error: "supplierId does not belong to this store" }); return; }
    }

    const [product] = await db.insert(productsTable).values({
      name, description, sku, barcode,
      price: String(price),
      cost: cost !== undefined ? String(cost) : null,
      taxRate: taxRate !== undefined ? String(taxRate) : null,
      stockQuantity: stockQuantity !== undefined ? String(stockQuantity) : "0",
      lowStockThreshold: lowStockThreshold !== undefined ? String(lowStockThreshold) : null,
      trackStock: trackStock !== undefined ? trackStock : true,
      imageUrl, categoryId, supplierId, storeId,
    }).returning();
    res.status(201).json(toProductJson(product));
  } catch (err) {
    logger.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [product] = await db.select().from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.storeId, storeId)));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(toProductJson(product));
  } catch (err) {
    logger.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.patch("/products/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, description, sku, barcode, price, cost, taxRate, stockQuantity,
            lowStockThreshold, trackStock, imageUrl, categoryId, supplierId, isActive } = req.body;
    // FK validation for changed references
    if (categoryId != null) {
      const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable)
        .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.storeId, storeId)));
      if (!cat) { res.status(422).json({ error: "categoryId does not belong to this store" }); return; }
    }
    if (supplierId != null) {
      const [sup] = await db.select({ id: suppliersTable.id }).from(suppliersTable)
        .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.storeId, storeId)));
      if (!sup) { res.status(422).json({ error: "supplierId does not belong to this store" }); return; }
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (sku !== undefined) updates.sku = sku;
    if (barcode !== undefined) updates.barcode = barcode;
    if (price !== undefined) updates.price = String(price);
    if (cost !== undefined) updates.cost = String(cost);
    if (taxRate !== undefined) updates.taxRate = String(taxRate);
    if (stockQuantity !== undefined) updates.stockQuantity = String(stockQuantity);
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = String(lowStockThreshold);
    if (trackStock !== undefined) updates.trackStock = trackStock;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (supplierId !== undefined) updates.supplierId = supplierId;
    if (isActive !== undefined) updates.isActive = isActive;
    const [product] = await db.update(productsTable).set(updates)
      .where(and(eq(productsTable.id, id), eq(productsTable.storeId, storeId))).returning();
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(toProductJson(product));
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.post("/products/:id/adjust-stock", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { quantity } = req.body as { quantity: number };
    const where = and(eq(productsTable.id, id), eq(productsTable.storeId, storeId));
    const [product] = await db.select().from(productsTable).where(where);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    const newQty = parseFloat(product.stockQuantity) + parseFloat(String(quantity));
    const [updated] = await db.update(productsTable).set({ stockQuantity: String(newQty) }).where(where).returning();
    res.json(toProductJson(updated));
  } catch (err) {
    logger.error({ err }, "Failed to adjust stock");
    res.status(500).json({ error: "Failed to adjust stock" });
  }
});

router.get("/products/:productId/variants", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId as string);
    const storeId = getStoreId(req);
    const [product] = await db.select({ id: productsTable.id }).from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.storeId, storeId)));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
    res.json(variants.map(v => ({
      ...v, price: parseFloat(v.price),
      cost: v.cost !== null ? parseFloat(v.cost) : null,
      stockQuantity: parseFloat(v.stockQuantity),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list variants");
    res.status(500).json({ error: "Failed to list variants" });
  }
});

router.post("/products/:productId/variants", requireRole("manager"), async (req, res) => {
  try {
    const productId = parseInt(req.params.productId as string);
    const storeId = getStoreId(req);
    const [product] = await db.select({ id: productsTable.id }).from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.storeId, storeId)));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    const { name, sku, barcode, price, cost, stockQuantity, attributes } = req.body;
    const [variant] = await db.insert(productVariantsTable).values({
      productId, name, sku, barcode,
      price: String(price),
      cost: cost !== undefined ? String(cost) : null,
      stockQuantity: stockQuantity !== undefined ? String(stockQuantity) : "0",
      attributes,
    }).returning();
    res.status(201).json({
      ...variant, price: parseFloat(variant.price),
      cost: variant.cost !== null ? parseFloat(variant.cost) : null,
      stockQuantity: parseFloat(variant.stockQuantity),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create variant");
    res.status(500).json({ error: "Failed to create variant" });
  }
});

export default router;
