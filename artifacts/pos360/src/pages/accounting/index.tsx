import { useListSales } from "@workspace/api-client-react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useCurrency } from "@/context/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ["#5AC85A", "#EF4444", "#3B82F6", "#F59E0B"];

const mockExpenses = [
  { category: "Rent", amount: 150000 },
  { category: "Utilities", amount: 35000 },
  { category: "Salaries", amount: 280000 },
  { category: "Supplies", amount: 45000 },
  { category: "Marketing", amount: 25000 },
];
const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0);

export default function AccountingOverview() {
  const [period, setPeriod] = useState(30);
  const { data: sales, isLoading } = useListSales({});
  const { fmt } = useCurrency();

  const cutoff = new Date(Date.now() - period * 86400000);
  const periodSales = (sales ?? []).filter(s => new Date(s.createdAt) >= cutoff);
  const totalRevenue = periodSales.reduce((s, sale) => s + Number(sale.total), 0);
  const totalTax = periodSales.reduce((s, sale) => s + Number(sale.taxAmount), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Daily data for chart
  const dailyMap: Record<string, { date: string; revenue: number; expenses: number }> = {};
  periodSales.forEach(s => {
    const d = new Date(s.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, expenses: 0 };
    dailyMap[d].revenue += Number(s.total);
    dailyMap[d].expenses = Math.round(totalExpenses / period);
  });
  const chartData = Object.values(dailyMap).slice(-14);

  const plData = [
    { name: "Revenue", value: totalRevenue, color: "#5AC85A" },
    { name: "Expenses", value: totalExpenses, color: "#EF4444" },
    { name: "Net Profit", value: Math.max(0, grossProfit), color: "#3B82F6" },
    { name: "Tax", value: totalTax, color: "#F59E0B" },
  ];

  return (
    <UpgradeGate required="pro" featureName="Accounting">
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Accounting Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Profit & Loss summary and financial insights</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => <Button key={d} size="sm" variant={period === d ? "default" : "outline"} onClick={() => setPeriod(d)}>{d}d</Button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950", pct: "+12.5%" },
          { label: "Total Expenses", value: fmt(totalExpenses), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950", pct: "+3.2%" },
          { label: "Net Profit", value: fmt(Math.max(0, grossProfit)), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950", pct: grossProfit > 0 ? "+8.1%" : "-" },
          { label: "Profit Margin", value: `${profitMargin.toFixed(1)}%`, icon: BarChart3, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950", pct: profitMargin > 20 ? "Healthy" : "Low" },
        ].map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4 px-4">
              <div className={`absolute top-0 right-0 h-16 w-16 rounded-bl-full ${kpi.bg} opacity-50`} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-8 w-28" /> : (
                <>
                  <div className="text-xl md:text-2xl font-bold">{kpi.value}</div>
                  <span className="text-xs text-muted-foreground">{kpi.pct}</span>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => fmt(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" fill="#5AC85A" radius={[4,4,0,0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[4,4,0,0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>P&L Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={plData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                  {plData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {plData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="text-muted-foreground">{item.name}</span></div>
                  <span className="font-medium">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">% of Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {mockExpenses.map(e => (
                <TableRow key={e.category}>
                  <TableCell className="font-medium">{e.category}</TableCell>
                  <TableCell className="text-right">{fmt(e.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{((e.amount / totalExpenses) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/30"><TableCell>Total</TableCell><TableCell className="text-right">{fmt(totalExpenses)}</TableCell><TableCell className="text-right">100%</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </UpgradeGate>
  );
}
