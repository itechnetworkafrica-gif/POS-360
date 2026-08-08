import { Router } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

router.get("/suppliers", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const suppliers = await db.select().from(suppliersTable)
      .where(eq(suppliersTable.storeId, storeId)).orderBy(suppliersTable.name);
    res.json(suppliers);
  } catch (err) {
    logger.error({ err }, "Failed to list suppliers");
    res.status(500).json({ error: "Failed to list suppliers" });
  }
});

router.post("/suppliers", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, contactName, email, phone, address, notes } = req.body as {
      name: string; contactName?: string; email?: string; phone?: string; address?: string; notes?: string;
    };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [supplier] = await db.insert(suppliersTable).values({
      name, contactName, email, phone, address, notes, storeId,
    }).returning();
    res.status(201).json(supplier);
  } catch (err) {
    logger.error({ err }, "Failed to create supplier");
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.patch("/suppliers/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, contactName, email, phone, address, notes } = req.body as {
      name?: string; contactName?: string; email?: string; phone?: string; address?: string; notes?: string;
    };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (contactName !== undefined) updates.contactName = contactName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;
    const [supplier] = await db.update(suppliersTable).set(updates)
      .where(and(eq(suppliersTable.id, id), eq(suppliersTable.storeId, storeId))).returning();
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
    res.json(supplier);
  } catch (err) {
    logger.error({ err }, "Failed to update supplier");
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

router.delete("/suppliers/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(suppliersTable)
      .where(and(eq(suppliersTable.id, id), eq(suppliersTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete supplier");
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

export default router;
