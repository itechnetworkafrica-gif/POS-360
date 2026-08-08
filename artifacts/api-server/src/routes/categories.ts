import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

router.get("/categories", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const cats = await db.select().from(categoriesTable)
      .where(eq(categoriesTable.storeId, storeId)).orderBy(categoriesTable.name);
    res.json(cats);
  } catch (err) {
    logger.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/categories", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, color, icon } = req.body as { name: string; color?: string; icon?: string };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [cat] = await db.insert(categoriesTable).values({
      name, color: color || "#5AC85A", storeId,
      ...(icon !== undefined && { icon }),
    }).returning();
    res.status(201).json(cat);
  } catch (err) {
    logger.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/categories/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, color, icon } = req.body as { name?: string; color?: string; icon?: string };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    const [cat] = await db.update(categoriesTable).set(updates)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.storeId, storeId))).returning();
    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(cat);
  } catch (err) {
    logger.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
