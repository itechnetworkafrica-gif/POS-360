import { useGetProductsReport, useListCategories } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCurrency } from "@/context/currency";

const COLORS = ["#5AC85A", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#F97316"];

export default function ReportByCategory() {
  const { sym } = useCurrency();
  const { data: products, isLoading: productsLoading } = useGetProductsReport({});
  const { data: categories, isLoading: catsLoading } = useListCategories({});
  const isLoading = productsLoading || catsLoading;

  const catMap: Record<string, string> = {};
  (categories ?? []).forEach(c => { catMap[c.name] = c.name; });

  const catData: Record<string, { name: string; revenue: number; quantitySold: number; productCount: number }> = {};
  (products ?? []).forEach(p => {
    const cat = p.categoryName || "Uncategorized";
    if (!catData[cat]) catData[cat] = { name: cat, revenue: 0, quantitySold: 0, productCount: 0 };
    catData[cat].revenue += p.revenue;
    catData[cat].quantitySold += p.quantitySold;
    catData[cat].productCount++;
  });

  const rows = Object.values(catData).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales by Category</h1>
        <p className="text-muted-foreground text-sm mt-1">Revenue breakdown by product category</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue Distribution</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={rows} cx="50%" cy="50%" outerRadius={100} dataKey="revenue" nameKey="name">
                    {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${sym}${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.productCount}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{row.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
