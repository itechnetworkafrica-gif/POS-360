import { Router } from "express";
import { db, storesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/stores", async (req, res) => {
  try {
    const stores = await db.select().from(storesTable).orderBy(storesTable.createdAt);
    res.json(stores.map(s => ({
      ...s,
      taxRate: s.taxRate !== null ? parseFloat(s.taxRate) : null,
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list stores");
    res.status(500).json({ error: "Failed to list stores" });
  }
});

router.post("/stores", async (req, res) => {
  try {
    const { name, address, phone, email, currency, timezone, taxRate, receiptHeader, receiptFooter } = req.body;
    const [store] = await db.insert(storesTable).values({
      name,
      address,
      phone,
      email,
      currency: currency || "USD",
      timezone: timezone || "UTC",
      taxRate: taxRate !== undefined ? String(taxRate) : null,
      receiptHeader,
      receiptFooter,
    }).returning();
    res.status(201).json({ ...store, taxRate: store.taxRate !== null ? parseFloat(store.taxRate) : null });
  } catch (err) {
    logger.error({ err }, "Failed to create store");
    res.status(500).json({ error: "Failed to create store" });
  }
});

router.get("/stores/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, id));
    if (!store) return res.status(404).json({ error: "Store not found" });
    res.json({ ...store, taxRate: store.taxRate !== null ? parseFloat(store.taxRate) : null });
  } catch (err) {
    logger.error({ err }, "Failed to get store");
    res.status(500).json({ error: "Failed to get store" });
  }
});

router.patch("/stores/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, phone, email, currency, timezone, taxRate, receiptHeader, receiptFooter, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (currency !== undefined) updates.currency = currency;
    if (timezone !== undefined) updates.timezone = timezone;
    if (taxRate !== undefined) updates.taxRate = String(taxRate);
    if (receiptHeader !== undefined) updates.receiptHeader = receiptHeader;
    if (receiptFooter !== undefined) updates.receiptFooter = receiptFooter;
    if (isActive !== undefined) updates.isActive = isActive;
    const [store] = await db.update(storesTable).set(updates).where(eq(storesTable.id, id)).returning();
    if (!store) return res.status(404).json({ error: "Store not found" });
    res.json({ ...store, taxRate: store.taxRate !== null ? parseFloat(store.taxRate) : null });
  } catch (err) {
    logger.error({ err }, "Failed to update store");
    res.status(500).json({ error: "Failed to update store" });
  }
});

export default router;
