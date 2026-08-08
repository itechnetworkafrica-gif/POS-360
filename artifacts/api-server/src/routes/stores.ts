import { Router } from "express";
import { db, storesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toStoreJson(s: typeof storesTable.$inferSelect) {
  return { ...s, taxRate: s.taxRate !== null ? parseFloat(s.taxRate) : null };
}

router.get("/stores", async (req, res) => {
  try {
    const userId = req.user!.id;
    // Owners see only their stores; employees see the store they belong to (via storeId)
    const storeId = req.user!.storeId;
    if (req.user!.userType === "owner") {
      const stores = await db.select().from(storesTable).where(eq(storesTable.ownerId, userId));
      res.json(stores.map(toStoreJson));
    } else {
      // Employees see only their assigned store
      if (storeId == null) { res.json([]); return; }
      const stores = await db.select().from(storesTable).where(eq(storesTable.id, storeId));
      res.json(stores.map(toStoreJson));
    }
  } catch (err) {
    logger.error({ err }, "Failed to list stores");
    res.status(500).json({ error: "Failed to list stores" });
  }
});

router.post("/stores", async (req, res) => {
  try {
    if (req.user!.userType !== "owner") {
      res.status(403).json({ error: "Only store owners can create stores" });
      return;
    }
    const { name, address, phone, email, currency, timezone, taxRate, receiptHeader, receiptFooter } = req.body;
    const [store] = await db.insert(storesTable).values({
      ownerId: req.user!.id,      // always set from JWT, never from body
      name,
      address,
      phone,
      email,
      currency: currency || "NGN",
      timezone: timezone || "Africa/Lagos",
      taxRate: taxRate !== undefined ? String(taxRate) : null,
      receiptHeader,
      receiptFooter,
    }).returning();
    res.status(201).json(toStoreJson(store));
  } catch (err) {
    logger.error({ err }, "Failed to create store");
    res.status(500).json({ error: "Failed to create store" });
  }
});

router.get("/stores/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;
    const storeId = req.user!.storeId;
    const where = req.user!.userType === "owner"
      ? and(eq(storesTable.id, id), eq(storesTable.ownerId, userId))
      : and(eq(storesTable.id, id), storeId != null ? eq(storesTable.id, storeId) : eq(storesTable.id, -1));
    const [store] = await db.select().from(storesTable).where(where);
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    res.json(toStoreJson(store));
  } catch (err) {
    logger.error({ err }, "Failed to get store");
    res.status(500).json({ error: "Failed to get store" });
  }
});

router.patch("/stores/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;
    if (req.user!.userType !== "owner") {
      res.status(403).json({ error: "Only store owners can modify stores" });
      return;
    }
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
    // Enforce ownerId — owners can only update their own stores
    const [store] = await db.update(storesTable).set(updates)
      .where(and(eq(storesTable.id, id), eq(storesTable.ownerId, userId))).returning();
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    res.json(toStoreJson(store));
  } catch (err) {
    logger.error({ err }, "Failed to update store");
    res.status(500).json({ error: "Failed to update store" });
  }
});

export default router;
