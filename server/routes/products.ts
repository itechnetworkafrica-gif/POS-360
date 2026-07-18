import { Router } from "express";
import { db, productsTable, productVariantsTable } from "../../db";
import { eq, and, ilike, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toProductJson(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    price: parseFloat(p.price),
    cost: p.cost !== null ? parseFloat(p.cost) : null,
    taxRate: p.taxRate !== null ? parseFloat(p.taxRate) : null,
    stockQuantity: parseFloat(p.stockQuantity),
    lowStockThreshold: p.lowStockThreshold !== null ? parseFloat(p.lowStockThreshold) : null,
  };
}

router.get("/products", async (req, res) => {
  try {
    const { storeId, categoryId, search, lowStock } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(productsTable.storeId, parseInt(storeId as string)));
    if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId as string)));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    const products = conditions.length > 0
      ? await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.name)
      : await db.select().from(productsTable).orderBy(productsTable.name);
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

router.post("/products", async (req, res) => {
  try {
    const { name, description, sku, barcode, price, cost, taxRate, stockQuantity, lowStockThreshold, trackStock, imageUrl, categoryId, supplierId, storeId } = req.body;
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
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(toProductJson(product));
  } catch (err) {
    logger.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, sku, barcode, price, cost, taxRate, stockQuantity, lowStockThreshold, trackStock, imageUrl, categoryId, supplierId, isActive } = req.body;
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
    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(toProductJson(product));
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.post("/products/:id/adjust-stock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, reason } = req.body;
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    const newQty = parseFloat(product.stockQuantity) + parseFloat(String(quantity));
    const [updated] = await db.update(productsTable).set({ stockQuantity: String(newQty) }).where(eq(productsTable.id, id)).returning();
    res.json(toProductJson(updated));
  } catch (err) {
    logger.error({ err }, "Failed to adjust stock");
    res.status(500).json({ error: "Failed to adjust stock" });
  }
});

router.get("/products/:productId/variants", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
    res.json(variants.map(v => ({
      ...v,
      price: parseFloat(v.price),
      cost: v.cost !== null ? parseFloat(v.cost) : null,
      stockQuantity: parseFloat(v.stockQuantity),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list variants");
    res.status(500).json({ error: "Failed to list variants" });
  }
});

router.post("/products/:productId/variants", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { name, sku, barcode, price, cost, stockQuantity, attributes } = req.body;
    const [variant] = await db.insert(productVariantsTable).values({
      productId, name, sku, barcode,
      price: String(price),
      cost: cost !== undefined ? String(cost) : null,
      stockQuantity: stockQuantity !== undefined ? String(stockQuantity) : "0",
      attributes,
    }).returning();
    res.status(201).json({
      ...variant,
      price: parseFloat(variant.price),
      cost: variant.cost !== null ? parseFloat(variant.cost) : null,
      stockQuantity: parseFloat(variant.stockQuantity),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create variant");
    res.status(500).json({ error: "Failed to create variant" });
  }
});

export default router;
