import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, categoriesTable, employeesTable, timeEntriesTable } from "../../db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/reports/sales", async (req, res) => {
  try {
    const { storeId, dateFrom, dateTo, groupBy = "day" } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) { const d = new Date(dateTo as string); d.setHours(23, 59, 59, 999); conditions.push(lte(salesTable.createdAt, d)); }
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions))
      : await db.select().from(salesTable);
    let totalRevenue = 0, totalTax = 0, totalDiscount = 0;
    const grouped: Record<string, { revenue: number; sales: number; tax: number }> = {};
    for (const s of sales) {
      totalRevenue += parseFloat(s.total);
      totalTax += parseFloat(s.taxAmount);
      totalDiscount += parseFloat(s.discountAmount);
      const d = new Date(s.createdAt);
      let key: string;
      if (groupBy === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else if (groupBy === "week") { const start = new Date(d); start.setDate(d.getDate() - d.getDay()); key = start.toISOString().slice(0, 10); }
      else key = d.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = { revenue: 0, sales: 0, tax: 0 };
      grouped[key].revenue += parseFloat(s.total);
      grouped[key].sales += 1;
      grouped[key].tax += parseFloat(s.taxAmount);
    }
    const data = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
    res.json({ totalRevenue, totalSales: sales.length, totalTax, totalDiscount, averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0, data });
  } catch (err) {
    logger.error({ err }, "Failed to get sales report");
    res.status(500).json({ error: "Failed to get sales report" });
  }
});

router.get("/reports/products", async (req, res) => {
  try {
    const { storeId, dateFrom, dateTo } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) { const d = new Date(dateTo as string); d.setHours(23, 59, 59, 999); conditions.push(lte(salesTable.createdAt, d)); }
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions))
      : await db.select().from(salesTable);
    const productMap: Record<number, { productName: string; categoryName: string | null; quantitySold: number; revenue: number; profit: number | null; stockQuantity: number }> = {};
    for (const sale of sales) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      for (const item of items) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { productName: item.productName, categoryName: null, quantitySold: 0, revenue: 0, profit: null, stockQuantity: 0 };
        }
        productMap[item.productId].quantitySold += parseFloat(item.quantity);
        productMap[item.productId].revenue += parseFloat(item.total);
      }
    }
    const products = await db.select().from(productsTable);
    const cats = await db.select().from(categoriesTable);
    const catMap: Record<number, string> = {};
    for (const c of cats) catMap[c.id] = c.name;
    for (const p of products) {
      if (productMap[p.id]) {
        productMap[p.id].stockQuantity = parseFloat(p.stockQuantity);
        productMap[p.id].categoryName = p.categoryId ? catMap[p.categoryId] || null : null;
        if (p.cost) productMap[p.id].profit = productMap[p.id].revenue - (parseFloat(p.cost) * productMap[p.id].quantitySold);
      }
    }
    const result = Object.entries(productMap)
      .map(([productId, data]) => ({ productId: parseInt(productId), ...data }))
      .sort((a, b) => b.revenue - a.revenue);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get products report");
    res.status(500).json({ error: "Failed to get products report" });
  }
});

router.get("/reports/employees", async (req, res) => {
  try {
    const { storeId, dateFrom, dateTo } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) { const d = new Date(dateTo as string); d.setHours(23, 59, 59, 999); conditions.push(lte(salesTable.createdAt, d)); }
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions))
      : await db.select().from(salesTable);
    const employees = await db.select().from(employeesTable);
    const empMap: Record<number, { employeeName: string; role: string; totalSales: number; totalRevenue: number; hoursWorked: number }> = {};
    for (const e of employees) empMap[e.id] = { employeeName: e.name, role: e.role, totalSales: 0, totalRevenue: 0, hoursWorked: 0 };
    for (const s of sales) {
      if (s.employeeId && empMap[s.employeeId]) {
        empMap[s.employeeId].totalSales += 1;
        empMap[s.employeeId].totalRevenue += parseFloat(s.total);
      }
    }
    const entries = await db.select().from(timeEntriesTable);
    for (const e of entries) {
      if (empMap[e.employeeId] && e.hoursWorked) {
        empMap[e.employeeId].hoursWorked += parseFloat(e.hoursWorked);
      }
    }
    const result = Object.entries(empMap).map(([employeeId, data]) => ({
      employeeId: parseInt(employeeId),
      ...data,
      averageOrderValue: data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0,
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get employees report");
    res.status(500).json({ error: "Failed to get employees report" });
  }
});

router.get("/reports/inventory", async (req, res) => {
  try {
    const { storeId } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(productsTable.storeId, parseInt(storeId as string)));
    const products = conditions.length > 0
      ? await db.select().from(productsTable).where(and(...conditions))
      : await db.select().from(productsTable);
    const cats = await db.select().from(categoriesTable);
    const catMap: Record<number, string> = {};
    for (const c of cats) catMap[c.id] = c.name;
    const result = products.map(p => {
      const qty = parseFloat(p.stockQuantity);
      const cost = p.cost ? parseFloat(p.cost) : 0;
      const threshold = p.lowStockThreshold ? parseFloat(p.lowStockThreshold) : null;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        categoryName: p.categoryId ? catMap[p.categoryId] || null : null,
        stockQuantity: qty,
        stockValue: qty * cost,
        lowStockThreshold: threshold,
        isLowStock: threshold !== null && qty <= threshold,
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
    const { storeId, dateFrom, dateTo } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    if (dateFrom) conditions.push(gte(salesTable.createdAt, new Date(dateFrom as string)));
    if (dateTo) { const d = new Date(dateTo as string); d.setHours(23, 59, 59, 999); conditions.push(lte(salesTable.createdAt, d)); }
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
    const data = Object.entries(rateMap).map(([taxRate, v]) => ({ taxRate: parseFloat(taxRate), ...v }));
    res.json({ totalTax, totalRevenue, data });
  } catch (err) {
    logger.error({ err }, "Failed to get tax report");
    res.status(500).json({ error: "Failed to get tax report" });
  }
});

export default router;
