import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCurrency } from "@/context/currency";

export default function IncomeTracking() {
  const { sym } = useCurrency();
  const [period, setPeriod] = useState(30);
  const { data: sales, isLoading } = useListSales({});

  const cutoff = new Date(Date.now() - period * 86400000);
  const periodSales = (sales ?? []).filter(s => new Date(s.createdAt) >= cutoff).slice().reverse();

  const dailyRevenue: Record<string, number> = {};
  periodSales.forEach(s => {
    const d = new Date(s.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    dailyRevenue[d] = (dailyRevenue[d] ?? 0) + Number(s.total);
  });
  const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));

  const total = periodSales.reduce((s, sale) => s + Number(sale.total), 0);
  const taxTotal = periodSales.reduce((s, sale) => s + Number(sale.taxAmount), 0);
  const netRevenue = total - taxTotal;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Income Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">All revenue and income records</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => <Button key={d} size="sm" variant={period === d ? "default" : "outline"} onClick={() => setPeriod(d)}>{d}d</Button>)}
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Gross Revenue", value: `${sym}${total.toLocaleString()}`, note: "Before tax & deductions" },
          { label: "Tax Collected", value: `${sym}${taxTotal.toLocaleString()}`, note: "VAT & service charges" },
          { label: "Net Revenue", value: `${sym}${netRevenue.toLocaleString()}`, note: "After deductions" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">{kpi.label}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-28" /> : (
                <><div className="text-2xl font-bold text-green-600">{kpi.value}</div><p className="text-xs text-muted-foreground mt-0.5">{kpi.note}</p></>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Revenue Trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5AC85A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5AC85A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke="#5AC85A" strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Income Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead className="hidden sm:table-cell">Payment</TableHead><TableHead className="hidden md:table-cell">Tax</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? Array.from({length: 8}).map((_, i) => <TableRow key={i}>{Array.from({length: 5}).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>) :
                periodSales.slice().reverse().slice(0, 50).map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{sale.receiptNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs capitalize">{sale.paymentMethod.replace("_"," ")}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{sym}{Number(sale.taxAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{sym}{Number(sale.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
