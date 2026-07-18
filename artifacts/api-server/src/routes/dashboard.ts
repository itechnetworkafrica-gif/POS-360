import { Router } from "express";
import { db, salesTable, saleItemsTable, customersTable, productsTable, storesTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function getPeriodDates(period: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today": return { start: today, end: now };
    case "week": {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { start, end: now };
    }
    case "month": {
      const start = new Date(today);
      start.setDate(1);
      return { start, end: now };
    }
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end: now };
    }
    default: return { start: today, end: now };
  }
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const { storeId, period = "today" } = req.query;
    const { start, end } = getPeriodDates(period as string);
    const conditions: SQL[] = [gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));

    const sales = await db.select().from(salesTable).where(and(...conditions));
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalSales = sales.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const prevConditions: SQL[] = [];
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    prevConditions.push(gte(salesTable.createdAt, prevStart), lte(salesTable.createdAt, start));
    if (storeId) prevConditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    const prevSales = await db.select().from(salesTable).where(and(...prevConditions));
    const prevRevenue = prevSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const salesGrowth = prevSales.length > 0 ? ((totalSales - prevSales.length) / prevSales.length) * 100 : 0;

    const allCustomers = await db.select().from(customersTable);
    const allProducts = await db.select().from(productsTable);

    const paymentCounts: Record<string, { amount: number; count: number }> = {};
    for (const s of sales) {
      const pm = s.paymentMethod;
      if (!paymentCounts[pm]) paymentCounts[pm] = { amount: 0, count: 0 };
      paymentCounts[pm].amount += parseFloat(s.total);
      paymentCounts[pm].count += 1;
    }
    const topPaymentMethod = Object.entries(paymentCounts).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || "cash";
    const paymentMethodBreakdown = Object.entries(paymentCounts).map(([method, { amount, count }]) => ({ method, amount, count }));

    const hourly: Record<number, { revenue: number; count: number }> = {};
    for (let i = 0; i < 24; i++) hourly[i] = { revenue: 0, count: 0 };
    for (const s of sales) {
      const h = new Date(s.createdAt).getHours();
      hourly[h].revenue += parseFloat(s.total);
      hourly[h].count += 1;
    }
    const salesByHour = Object.entries(hourly).map(([hour, data]) => ({ hour: parseInt(hour), ...data }));

    const lowStockProducts = allProducts.filter(p => p.lowStockThreshold !== null && parseFloat(p.stockQuantity) <= parseFloat(p.lowStockThreshold));

    res.json({
      totalRevenue,
      totalSales,
      totalCustomers: allCustomers.length,
      totalProducts: allProducts.length,
      averageOrderValue: avgOrderValue,
      revenueGrowth,
      salesGrowth,
      topPaymentMethod,
      lowStockCount: lowStockProducts.length,
      activeEmployees: 0,
      salesByHour,
      paymentMethodBreakdown,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/recent-sales", async (req, res) => {
  try {
    const { storeId, limit = "10" } = req.query;
    const limitNum = parseInt(limit as string);
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions)).orderBy(salesTable.createdAt).limit(limitNum)
      : await db.select().from(salesTable).orderBy(salesTable.createdAt).limit(limitNum);
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
    res.json(result.reverse());
  } catch (err) {
    logger.error({ err }, "Failed to get recent sales");
    res.status(500).json({ error: "Failed to get recent sales" });
  }
});

router.get("/dashboard/top-products", async (req, res) => {
  try {
    const { storeId, period = "week", limit = "10" } = req.query;
    const { start } = getPeriodDates(period as string);
    const conditions: SQL[] = [gte(salesTable.createdAt, start)];
    if (storeId) conditions.push(eq(salesTable.storeId, parseInt(storeId as string)));
    const sales = await db.select().from(salesTable).where(and(...conditions));
    const productMap: Record<number, { productName: string; quantitySold: number; revenue: number; stockQuantity: number }> = {};
    for (const sale of sales) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      for (const item of items) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { productName: item.productName, quantitySold: 0, revenue: 0, stockQuantity: 0 };
        }
        productMap[item.productId].quantitySold += parseFloat(item.quantity);
        productMap[item.productId].revenue += parseFloat(item.total);
      }
    }
    const products = await db.select().from(productsTable);
    for (const p of products) {
      if (productMap[p.id]) productMap[p.id].stockQuantity = parseFloat(p.stockQuantity);
    }
    const sorted = Object.entries(productMap)
      .map(([productId, data]) => ({ productId: parseInt(productId), categoryName: null, profit: null, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit as string));
    res.json(sorted);
  } catch (err) {
    logger.error({ err }, "Failed to get top products");
    res.status(500).json({ error: "Failed to get top products" });
  }
});

router.get("/dashboard/low-stock-alerts", async (req, res) => {
  try {
    const { storeId } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(productsTable.storeId, parseInt(storeId as string)));
    const products = conditions.length > 0
      ? await db.select().from(productsTable).where(and(...conditions))
      : await db.select().from(productsTable);
    const lowStock = products.filter(p =>
      p.lowStockThreshold !== null && parseFloat(p.stockQuantity) <= parseFloat(p.lowStockThreshold)
    ).map(p => ({
      ...p,
      price: parseFloat(p.price),
      cost: p.cost !== null ? parseFloat(p.cost) : null,
      taxRate: p.taxRate !== null ? parseFloat(p.taxRate) : null,
      stockQuantity: parseFloat(p.stockQuantity),
      lowStockThreshold: p.lowStockThreshold !== null ? parseFloat(p.lowStockThreshold) : null,
    }));
    res.json(lowStock);
  } catch (err) {
    logger.error({ err }, "Failed to get low stock alerts");
    res.status(500).json({ error: "Failed to get low stock alerts" });
  }
});

export default router;
