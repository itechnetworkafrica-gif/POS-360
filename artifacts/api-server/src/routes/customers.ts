import { Router } from "express";
import { db, customersTable, customerGroupsTable, salesTable, saleItemsTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate in routes/index.ts
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

function toCustomerJson(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    loyaltyPoints: parseFloat(c.loyaltyPoints),
    totalSpent: parseFloat(c.totalSpent),
  };
}

router.get("/customers", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { search, groupId } = req.query;
    const conditions: SQL[] = [eq(customersTable.storeId, storeId)];
    if (search) conditions.push(ilike(customersTable.name, `%${search}%`));
    if (groupId) conditions.push(eq(customersTable.groupId, parseInt(groupId as string)));
    const customers = await db.select().from(customersTable).where(and(...conditions)).orderBy(customersTable.name);
    res.json(customers.map(toCustomerJson));
  } catch (err) {
    logger.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, email, phone, address, birthday, groupId, notes } = req.body as {
      name: string; email?: string; phone?: string; address?: string;
      birthday?: string; groupId?: number; notes?: string;
    };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    // Validate groupId belongs to this store
    if (groupId) {
      const [grp] = await db.select({ id: customerGroupsTable.id }).from(customerGroupsTable)
        .where(and(eq(customerGroupsTable.id, groupId), eq(customerGroupsTable.storeId, storeId)));
      if (!grp) { res.status(422).json({ error: "groupId does not belong to this store" }); return; }
    }
    const [customer] = await db.insert(customersTable).values({
      name, email, phone, address, birthday, groupId: groupId ?? null, notes, storeId,
    }).returning();
    res.status(201).json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [customer] = await db.select().from(customersTable)
      .where(and(eq(customersTable.id, id), eq(customersTable.storeId, storeId)));
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Failed to get customer" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, email, phone, address, birthday, groupId, notes } = req.body as {
      name?: string; email?: string; phone?: string; address?: string;
      birthday?: string; groupId?: number | null; notes?: string;
    };
    // Validate groupId belongs to this store if provided and non-null
    if (groupId != null) {
      const [grp] = await db.select({ id: customerGroupsTable.id }).from(customerGroupsTable)
        .where(and(eq(customerGroupsTable.id, groupId), eq(customerGroupsTable.storeId, storeId)));
      if (!grp) { res.status(422).json({ error: "groupId does not belong to this store" }); return; }
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (birthday !== undefined) updates.birthday = birthday;
    if (groupId !== undefined) updates.groupId = groupId;
    if (notes !== undefined) updates.notes = notes;
    const [customer] = await db.update(customersTable).set(updates)
      .where(and(eq(customersTable.id, id), eq(customersTable.storeId, storeId))).returning();
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(customersTable)
      .where(and(eq(customersTable.id, id), eq(customersTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

router.get("/customers/:id/purchase-history", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [customer] = await db.select({ id: customersTable.id }).from(customersTable)
      .where(and(eq(customersTable.id, id), eq(customersTable.storeId, storeId)));
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    const sales = await db.select().from(salesTable)
      .where(and(eq(salesTable.customerId, id), eq(salesTable.storeId, storeId)))
      .orderBy(salesTable.createdAt);
    const result = await Promise.all(sales.map(async (sale) => {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      return {
        ...sale,
        subtotal: parseFloat(sale.subtotal), discountAmount: parseFloat(sale.discountAmount),
        taxAmount: parseFloat(sale.taxAmount), total: parseFloat(sale.total),
        items: items.map(i => ({
          ...i, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice),
          discount: parseFloat(i.discount), taxRate: parseFloat(i.taxRate), total: parseFloat(i.total),
        })),
      };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get purchase history");
    res.status(500).json({ error: "Failed to get purchase history" });
  }
});

// Customer groups — manager/owner only for mutations
router.get("/customer-groups", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const groups = await db.select().from(customerGroupsTable)
      .where(eq(customerGroupsTable.storeId, storeId)).orderBy(customerGroupsTable.name);
    res.json(groups.map(g => ({
      ...g,
      discountPercent: parseFloat(g.discountPercent),
      loyaltyMultiplier: parseFloat(g.loyaltyMultiplier),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list customer groups");
    res.status(500).json({ error: "Failed to list customer groups" });
  }
});

router.post("/customer-groups", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, discountPercent, loyaltyMultiplier } = req.body as {
      name: string; discountPercent?: number; loyaltyMultiplier?: number;
    };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [group] = await db.insert(customerGroupsTable).values({
      name, storeId,
      discountPercent: discountPercent !== undefined ? String(discountPercent) : "0",
      loyaltyMultiplier: loyaltyMultiplier !== undefined ? String(loyaltyMultiplier) : "1",
    }).returning();
    res.status(201).json({
      ...group,
      discountPercent: parseFloat(group.discountPercent),
      loyaltyMultiplier: parseFloat(group.loyaltyMultiplier),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create customer group");
    res.status(500).json({ error: "Failed to create customer group" });
  }
});

router.patch("/customer-groups/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, discountPercent, loyaltyMultiplier } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (discountPercent !== undefined) updates.discountPercent = String(discountPercent);
    if (loyaltyMultiplier !== undefined) updates.loyaltyMultiplier = String(loyaltyMultiplier);
    const [group] = await db.update(customerGroupsTable).set(updates)
      .where(and(eq(customerGroupsTable.id, id), eq(customerGroupsTable.storeId, storeId))).returning();
    if (!group) { res.status(404).json({ error: "Customer group not found" }); return; }
    res.json({ ...group, discountPercent: parseFloat(group.discountPercent), loyaltyMultiplier: parseFloat(group.loyaltyMultiplier) });
  } catch (err) {
    logger.error({ err }, "Failed to update customer group");
    res.status(500).json({ error: "Failed to update customer group" });
  }
});

router.delete("/customer-groups/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(customerGroupsTable)
      .where(and(eq(customerGroupsTable.id, id), eq(customerGroupsTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete customer group");
    res.status(500).json({ error: "Failed to delete customer group" });
  }
});

export default router;
