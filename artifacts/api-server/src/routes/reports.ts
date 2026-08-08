import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, categoriesTable, employeesTable, timeEntriesTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function parseDateRange(dateFrom?: string, dateTo?: string) {
  const conditions: SQL[] = [];
  if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom)));
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, d));
  }
  return conditions;
}

router.get("/reports/sales", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const { dateFrom, dateTo } = req.query;
    const conditions: SQL[] = [];
    if (storeId != null) conditions.push(eq(salesTable.storeId, storeId));
    conditions.push(...parseDateRange(dateFrom as string, dateTo as string));
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions))
      : await db.select().from(salesTable);
    const result = sales.map(s => ({
      ...s,
      subtotal: parseFloat(s.subtotal),
      discountAmount: parseFloat(s.discountAmount),
      taxAmount: parseFloat(s.taxAmount),
      total: parseFloat(s.total),
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get sales report");
    res.status(500).json({ error: "Failed to get sales report" });
  }
});

router.get("/reports/products", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const { dateFrom, dateTo } = req.query;
    const saleConds: SQL[] = [];
    if (storeId != null) saleConds.push(eq(salesTable.storeId, storeId));
    saleConds.push(...parseDateRange(dateFrom as string, dateTo as string));
    const sales = saleConds.length > 0
      ? await db.select().from(salesTable).where(and(...saleConds))
      : await db.select().from(salesTable);

    // Products scoped to this store
    const products = storeId != null
      ? await db.select().from(productsTable).where(eq(productsTable.storeId, storeId))
      : await db.select().from(productsTable);
    const productMap: Record<number, typeof productsTable.$inferSelect> = {};
    for (const p of products) productMap[p.id] = p;

    const categories = await db.select().from(categoriesTable);
    const catMap: Record<number, string> = {};
    for (const c of categories) catMap[c.id] = c.name;

    const totals: Record<number, { revenue: number; quantity: number; name: string; sku: string | null; categoryName: string | null }> = {};
    for (const sale of sales) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      for (const item of items) {
        const p = productMap[item.productId];
        if (!p) continue; // skip items from other stores
        if (!totals[item.productId]) {
          totals[item.productId] = {
            revenue: 0, quantity: 0, name: item.productName,
            sku: p.sku, categoryName: p.categoryId ? (catMap[p.categoryId] || null) : null,
          };
        }
        totals[item.productId].revenue += parseFloat(item.total);
        totals[item.productId].quantity += parseFloat(item.quantity);
      }
    }
    res.json(Object.entries(totals).map(([id, data]) => ({ productId: parseInt(id), ...data })));
  } catch (err) {
    logger.error({ err }, "Failed to get products report");
    res.status(500).json({ error: "Failed to get products report" });
  }
});

router.get("/reports/employees", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const { dateFrom, dateTo } = req.query;
    // Only employees from this store
    const employees = storeId != null
      ? await db.select().from(employeesTable).where(eq(employeesTable.storeId, storeId))
      : await db.select().from(employeesTable);

    const result = await Promise.all(employees.map(async (emp) => {
      const saleConds: SQL[] = [eq(salesTable.employeeId, emp.id)];
      if (storeId != null) saleConds.push(eq(salesTable.storeId, storeId));
      saleConds.push(...parseDateRange(dateFrom as string, dateTo as string));
      const empSales = await db.select().from(salesTable).where(and(...saleConds));
      const totalRevenue = empSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
      const entries = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.employeeId, emp.id));
      const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked !== null ? parseFloat(e.hoursWorked) : 0), 0);
      const { pin: _pin, ...empSafe } = emp;
      return { ...empSafe, totalSales: empSales.length, totalRevenue, totalHours };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get employees report");
    res.status(500).json({ error: "Failed to get employees report" });
  }
});

router.get("/reports/inventory", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const products = storeId != null
      ? await db.select().from(productsTable).where(eq(productsTable.storeId, storeId))
      : await db.select().from(productsTable);
    const categories = await db.select().from(categoriesTable);
    const catMap: Record<number, string> = {};
    for (const c of categories) catMap[c.id] = c.name;
    const result = products.map(p => {
      const qty = parseFloat(p.stockQuantity);
      const cost = p.cost !== null ? parseFloat(p.cost) : 0;
      const threshold = p.lowStockThreshold !== null ? parseFloat(p.lowStockThreshold) : null;
      return {
        id: p.id, name: p.name, sku: p.sku,
        categoryName: p.categoryId ? catMap[p.categoryId] || null : null,
        stockQuantity: qty, stockValue: qty * cost,
        lowStockThreshold: threshold, isLowStock: threshold !== null && qty <= threshold,
      };
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get inventory report");
    res.status(500).json({ error: "Failed to get inventory report" });
  }
});

router.get("/reports/taxes", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const { dateFrom, dateTo } = req.query;
    const conditions: SQL[] = [];
    if (storeId != null) conditions.push(eq(salesTable.storeId, storeId));
    conditions.push(...parseDateRange(dateFrom as string, dateTo as string));
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions))
      : await db.select().from(salesTable);
    let totalTax = 0;
    let totalRevenue = 0;
    const rateMap: Record<number, { taxableAmount: number; taxAmount: number; count: number }> = {};
    for (const sale of sales) {
      totalRevenue += parseFloat(sale.total);
      totalTax += parseFloat(sale.taxAmount);
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      for (const item of items) {
        const rate = Math.round(parseFloat(item.taxRate) * 100) / 100;
        if (!rateMap[rate]) rateMap[rate] = { taxableAmount: 0, taxAmount: 0, count: 0 };
        const taxable = parseFloat(item.total);
        rateMap[rate].taxableAmount += taxable;
        rateMap[rate].taxAmount += taxable * (rate / 100);
        rateMap[rate].count += 1;
      }
    }
    res.json({ totalTax, totalRevenue, data: Object.entries(rateMap).map(([taxRate, v]) => ({ taxRate: parseFloat(taxRate), ...v })) });
  } catch (err) {
    logger.error({ err }, "Failed to get tax report");
    res.status(500).json({ error: "Failed to get tax report" });
  }
});

export default router;
