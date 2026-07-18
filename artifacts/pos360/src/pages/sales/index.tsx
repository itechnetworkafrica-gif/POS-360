import { useGetSalesReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingCart, Receipt, Percent } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/currency";

const periods = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "week" },
  { label: "30 Days", value: "month" },
  { label: "This Year", value: "year" },
];

export default function SalesSummary() {
  const { sym } = useCurrency();
  const [period, setPeriod] = useState("week");
  const now = new Date();
  const dateFrom = period === "today"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    : period === "week"
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : period === "month"
    ? new Date(now.getTime() - 30 * 86400000).toISOString()
    : new Date(now.getFullYear(), 0, 1).toISOString();

  const { data: sales, isLoading } = useGetSalesReport({ dateFrom, groupBy: period === "year" ? "month" : "day" });

  const kpis = [
    { label: "Total Revenue", value: `${sym}${sales?.totalRevenue?.toLocaleString("en-NG", { minimumFractionDigits: 2 }) ?? "0.00"}`, icon: TrendingUp, color: "text-green-500" },
    { label: "Total Sales", value: sales?.totalSales ?? 0, icon: ShoppingCart, color: "text-blue-500" },
    { label: "Avg Order Value", value: `${sym}${sales?.averageOrderValue?.toLocaleString("en-NG", { minimumFractionDigits: 2 }) ?? "0.00"}`, icon: Receipt, color: "text-purple-500" },
    { label: "Total Discounts", value: `${sym}${sales?.totalDiscount?.toLocaleString("en-NG", { minimumFractionDigits: 2 }) ?? "0.00"}`, icon: Percent, color: "text-orange-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales Summary</h1>
          <p className="text-muted-foreground text-sm mt-1">Overall sales performance overview</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {periods.map(p => (
            <Button key={p.value} variant={period === p.value ? "default" : "outline"} size="sm" onClick={() => setPeriod(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-24" /> : (
                <div className="text-lg md:text-2xl font-bold">{kpi.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sales?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#5AC85A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
