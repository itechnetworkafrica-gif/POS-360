import {
  useGetDashboardSummary,
  useGetRecentSales,
  useGetTopProducts,
  useGetLowStockAlerts,
  useListSales,
  useGetProductsReport,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, AlertTriangle, Package,
  DollarSign, BarChart3, ArrowUpRight, ArrowDownRight, Plus, ShoppingBag,
  Star, Zap
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";
import { Link } from "wouter";
import { useCurrency } from "@/context/currency";

const PIE_COLORS = ["#5AC85A", "#3B82F6", "#8B5CF6", "#F59E0B"];

function KPICard({ label, value, sub, icon: Icon, trend, color, loading }: {
  label: string; value: string; sub?: string; icon: any; trend?: "up" | "down" | null;
  color: string; loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className={`absolute top-0 right-0 h-20 w-20 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity ${color}`} />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color} bg-opacity-15`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {loading ? <Skeleton className="h-8 w-32" /> : (
          <>
            <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
            {sub && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
                {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
                {sub}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { sym } = useCurrency();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({ storeId: 1 });
  const { data: recentSales, isLoading: salesLoading } = useGetRecentSales({ storeId: 1, limit: 6 });
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts({ storeId: 1, limit: 5 });
  const { data: lowStock, isLoading: stockLoading } = useGetLowStockAlerts({ storeId: 1 });
  const { data: allSales } = useListSales({});
  const { data: products } = useGetProductsReport({});

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Payment breakdown for pie chart
  const paymentBreakdown: Record<string, number> = {};
  (allSales ?? []).slice(-50).forEach(s => {
    const pm = s.paymentMethod.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
    paymentBreakdown[pm] = (paymentBreakdown[pm] ?? 0) + Number(s.total);
  });
  const pieData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name, value }));

  // Revenue trend (last 14 days from recent sales data)
  const trendMap: Record<string, number> = {};
  (allSales ?? []).forEach(s => {
    const d = new Date(s.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    trendMap[d] = (trendMap[d] ?? 0) + Number(s.total);
  });
  const trendData = Object.entries(trendMap).slice(-14).map(([date, revenue]) => ({ date, revenue }));

  const totalRevenue = summary?.totalRevenue ?? 0;
  const revenueGrowth = summary?.revenueGrowth ?? 0;
  const salesGrowth = summary?.salesGrowth ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/pos">
            <Button className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">New Sale</span>
            </Button>
          </Link>
          <Link href="/inventory/products">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={`${sym}${totalRevenue.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`}
          sub={`${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% from last period`}
          icon={TrendingUp}
          trend={revenueGrowth >= 0 ? "up" : "down"}
          color="bg-green-500"
          loading={summaryLoading}
        />
        <KPICard
          label="Total Sales"
          value={String(summary?.totalSales ?? 0)}
          sub={`${salesGrowth >= 0 ? "+" : ""}${salesGrowth.toFixed(1)}% from last period`}
          icon={ShoppingCart}
          trend={salesGrowth >= 0 ? "up" : "down"}
          color="bg-blue-500"
          loading={summaryLoading}
        />
        <KPICard
          label="Customers"
          value={String(summary?.totalCustomers ?? 0)}
          sub="Active customers"
          icon={Users}
          trend={null}
          color="bg-purple-500"
          loading={summaryLoading}
        />
        <KPICard
          label="Avg Order Value"
          value={`${sym}${(summary?.averageOrderValue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`}
          sub="Per transaction"
          icon={BarChart3}
          trend={null}
          color="bg-orange-500"
          loading={summaryLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <Badge variant="secondary" className="text-xs">Last 14 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {summaryLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5AC85A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#5AC85A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#5AC85A" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" nameKey="name">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${sym}${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{sym}{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Hour */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary?.salesByHour ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#5AC85A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Sales */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Sales</CardTitle>
              <Link href="/sales/receipts">
                <Button variant="ghost" size="sm" className="text-xs">View all →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {salesLoading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-5 w-20" />
                </div>
              )) : (recentSales ?? []).map(sale => (
                <div key={sale.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sale.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{sale.paymentMethod.replace("_", " ")}
                    </p>
                  </div>
                  <span className="font-bold text-sm shrink-0">{sym}{Number(sale.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Top Products */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Products</CardTitle>
                <Link href="/reports/by-item">
                  <Button variant="ghost" size="sm" className="text-xs">All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {topLoading ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3.5 w-14" />
                  </div>
                )) : (topProducts ?? []).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm flex-1 truncate">{(p as any).name ?? p.productName}</span>
                    <span className="text-xs font-bold text-green-600">{sym}{Number(p.revenue).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Low Stock
                </CardTitle>
                <Link href="/inventory/history">
                  <Button variant="ghost" size="sm" className="text-xs">All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {stockLoading ? (
                <div className="space-y-2 px-4 pb-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (lowStock ?? []).length === 0 ? (
                <div className="px-4 pb-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />All stock levels are healthy
                </div>
              ) : (lowStock ?? []).slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0 ml-2">{item.stockQuantity} left</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
