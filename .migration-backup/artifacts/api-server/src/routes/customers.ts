import { Router } from "express";
import { db, customersTable, customerGroupsTable, salesTable, saleItemsTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toCustomerJson(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    loyaltyPoints: parseFloat(c.loyaltyPoints),
    totalSpent: parseFloat(c.totalSpent),
  };
}

router.get("/customers", async (req, res) => {
  try {
    const { search, groupId } = req.query;
    const conditions: SQL[] = [];
    if (search) conditions.push(ilike(customersTable.name, `%${search}%`));
    if (groupId) conditions.push(eq(customersTable.groupId, parseInt(groupId as string)));
    const customers = conditions.length > 0
      ? await db.select().from(customersTable).where(and(...conditions)).orderBy(customersTable.name)
      : await db.select().from(customersTable).orderBy(customersTable.name);
    res.json(customers.map(toCustomerJson));
  } catch (err) {
    logger.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const { name, email, phone, address, birthday, groupId, notes } = req.body;
    const [customer] = await db.insert(customersTable).values({ name, email, phone, address, birthday, groupId, notes }).returning();
    res.status(201).json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Failed to get customer" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, address, birthday, groupId, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (birthday !== undefined) updates.birthday = birthday;
    if (groupId !== undefined) updates.groupId = groupId;
    if (notes !== undefined) updates.notes = notes;
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(toCustomerJson(customer));
  } catch (err) {
    logger.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

router.get("/customers/:id/purchase-history", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sales = await db.select().from(salesTable).where(eq(salesTable.customerId, id)).orderBy(salesTable.createdAt);
    const result = await Promise.all(sales.map(async (sale) => {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      return {
        ...sale,
        subtotal: parseFloat(sale.subtotal),
        discountAmount: parseFloat(sale.discountAmount),
        taxAmount: parseFloat(sale.taxAmount),
        total: parseFloat(sale.total),
        items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice), discount: parseFloat(i.discount), taxRate: parseFloat(i.taxRate), total: parseFloat(i.total) })),
      };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get purchase history");
    res.status(500).json({ error: "Failed to get purchase history" });
  }
});

router.get("/customer-groups", async (req, res) => {
  try {
    const groups = await db.select().from(customerGroupsTable).orderBy(customerGroupsTable.name);
    res.json(groups.map(g => ({ ...g, discountPercent: parseFloat(g.discountPercent), loyaltyMultiplier: parseFloat(g.loyaltyMultiplier) })));
  } catch (err) {
    logger.error({ err }, "Failed to list customer groups");
    res.status(500).json({ error: "Failed to list customer groups" });
  }
});

router.post("/customer-groups", async (req, res) => {
  try {
    const { name, discountPercent, loyaltyMultiplier } = req.body;
    const [group] = await db.insert(customerGroupsTable).values({
      name,
      discountPercent: discountPercent !== undefined ? String(discountPercent) : "0",
      loyaltyMultiplier: loyaltyMultiplier !== undefined ? String(loyaltyMultiplier) : "1",
    }).returning();
    res.status(201).json({ ...group, discountPercent: parseFloat(group.discountPercent), loyaltyMultiplier: parseFloat(group.loyaltyMultiplier) });
  } catch (err) {
    logger.error({ err }, "Failed to create customer group");
    res.status(500).json({ error: "Failed to create customer group" });
  }
});

export default router;
