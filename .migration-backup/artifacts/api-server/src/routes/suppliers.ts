import { Router } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/suppliers", async (req, res) => {
  try {
    const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
    res.json(suppliers);
  } catch (err) {
    logger.error({ err }, "Failed to list suppliers");
    res.status(500).json({ error: "Failed to list suppliers" });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const { name, contactName, email, phone, address, notes } = req.body;
    const [supplier] = await db.insert(suppliersTable).values({ name, contactName, email, phone, address, notes }).returning();
    res.status(201).json(supplier);
  } catch (err) {
    logger.error({ err }, "Failed to create supplier");
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.patch("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactName, email, phone, address, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (contactName !== undefined) updates.contactName = contactName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;
    const [supplier] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    logger.error({ err }, "Failed to update supplier");
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

router.delete("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete supplier");
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

export default router;
