import { Router } from "express";
import { db, salesTable, saleItemsTable, customersTable, productsTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function getPeriodDates(period: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":  return { start: today, end: now };
    case "week":   { const s = new Date(today); s.setDate(today.getDate() - 7); return { start: s, end: now }; }
    case "month":  { const s = new Date(today); s.setDate(1); return { start: s, end: now }; }
    case "year":   return { start: new Date(today.getFullYear(), 0, 1), end: now };
    default:       return { start: today, end: now };
  }
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    // Scope all queries to authenticated user's store
    const storeId = req.user!.storeId;
    const { period = "today" } = req.query;
    const { start, end } = getPeriodDates(period as string);

    const conditions: SQL[] = [gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)];
    if (storeId != null) conditions.push(eq(salesTable.storeId, storeId));
    const sales = await db.select().from(salesTable).where(and(...conditions));
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalSales = sales.length;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Previous period comparison
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevConds: SQL[] = [gte(salesTable.createdAt, prevStart), lte(salesTable.createdAt, start)];
    if (storeId != null) prevConds.push(eq(salesTable.storeId, storeId));
    const prevSales = await db.select().from(salesTable).where(and(...prevConds));
    const prevRevenue = prevSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const salesGrowth   = prevSales.length > 0 ? ((totalSales - prevSales.length) / prevSales.length) * 100 : 0;

    // Store-scoped customers and products
    const allCustomers = storeId != null
      ? await db.select().from(customersTable).where(eq(customersTable.storeId, storeId))
      : await db.select().from(customersTable);
    const allProducts = storeId != null
      ? await db.select().from(productsTable).where(eq(productsTable.storeId, storeId))
      : await db.select().from(productsTable);

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

    const lowStockProducts = allProducts.filter(p =>
      p.lowStockThreshold !== null && parseFloat(p.stockQuantity) <= parseFloat(p.lowStockThreshold)
    );

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
    const storeId = req.user!.storeId;
    const where = storeId != null ? eq(salesTable.storeId, storeId) : undefined;
    const sales = where
      ? await db.select().from(salesTable).where(where).orderBy(salesTable.createdAt).limit(20)
      : await db.select().from(salesTable).orderBy(salesTable.createdAt).limit(20);
    const result = await Promise.all(sales.map(async (sale) => {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      return {
        ...sale,
        subtotal: parseFloat(sale.subtotal),
        discountAmount: parseFloat(sale.discountAmount),
        taxAmount: parseFloat(sale.taxAmount),
        total: parseFloat(sale.total),
        items: items.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          discount: parseFloat(i.discount),
          taxRate: parseFloat(i.taxRate),
          total: parseFloat(i.total),
        })),
      };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get recent sales");
    res.status(500).json({ error: "Failed to get recent sales" });
  }
});

router.get("/dashboard/top-products", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const { period = "today" } = req.query;
    const { start, end } = getPeriodDates(period as string);
    const conditions: SQL[] = [gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)];
    if (storeId != null) conditions.push(eq(salesTable.storeId, storeId));
    const sales = await db.select().from(salesTable).where(and(...conditions));
    const productTotals: Record<number, { revenue: number; quantity: number; name: string }> = {};
    for (const sale of sales) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      for (const item of items) {
        if (!productTotals[item.productId]) {
          productTotals[item.productId] = { revenue: 0, quantity: 0, name: item.productName };
        }
        productTotals[item.productId].revenue += parseFloat(item.total);
        productTotals[item.productId].quantity += parseFloat(item.quantity);
      }
    }
    const result = Object.entries(productTotals)
      .map(([id, data]) => ({ productId: parseInt(id), ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get top products");
    res.status(500).json({ error: "Failed to get top products" });
  }
});

router.get("/dashboard/low-stock-alerts", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const products = storeId != null
      ? await db.select().from(productsTable).where(eq(productsTable.storeId, storeId))
      : await db.select().from(productsTable);
    const lowStock = products.filter(p =>
      p.trackStock && p.lowStockThreshold !== null &&
      parseFloat(p.stockQuantity) <= parseFloat(p.lowStockThreshold)
    ).map(p => ({
      ...p,
      price: parseFloat(p.price),
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
