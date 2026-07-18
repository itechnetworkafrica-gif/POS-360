import { useListSales } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/currency";

const COLORS = ["#5AC85A", "#3B82F6", "#8B5CF6", "#F59E0B"];

const periods = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "All Time", days: -1 },
];

export default function ReportByPayment() {
  const { sym } = useCurrency();
  const [period, setPeriod] = useState(7);
  const { data: sales, isLoading } = useListSales({});

  const cutoff = period === -1 ? null : new Date(Date.now() - period * 86400000);
  const filtered = (sales ?? []).filter(s => !cutoff || new Date(s.createdAt) >= cutoff);

  const breakdown: Record<string, { count: number; amount: number }> = {};
  filtered.forEach(s => {
    const pm = s.paymentMethod;
    if (!breakdown[pm]) breakdown[pm] = { count: 0, amount: 0 };
    breakdown[pm].count++;
    breakdown[pm].amount += Number(s.total);
  });

  const rows = Object.entries(breakdown).map(([method, data]) => ({ method: method.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), ...data })).sort((a, b) => b.amount - a.amount);
  const pieData = rows.map(r => ({ name: r.method, value: r.amount }));
  const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales by Payment</h1>
          <p className="text-muted-foreground text-sm mt-1">Revenue breakdown by payment method</p>
        </div>
        <div className="flex gap-1">
          {periods.map(p => (
            <Button key={p.days} variant={period === p.days ? "default" : "outline"} size="sm" onClick={() => setPeriod(p.days)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {rows.map((r, i) => (
          <Card key={r.method}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-sm font-medium text-muted-foreground">{r.method}</span>
              </div>
              <div className="text-2xl font-bold">{sym}{r.amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.count} transactions</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Distribution</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${sym}${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Method Details</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.method}>
                    <TableCell><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="font-medium">{r.method}</span></div></TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{totalRevenue > 0 ? ((r.amount / totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
                  <TableCell className="text-right">{sym}{totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
