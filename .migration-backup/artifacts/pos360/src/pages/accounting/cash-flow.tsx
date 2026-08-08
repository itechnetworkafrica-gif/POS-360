import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState } from "react";
import { useCurrency } from "@/context/currency";

const mockExpensesByDay: Record<string, number> = {};
const BASE_DAILY_EXPENSE = 18000;

export default function CashFlow() {
  const { sym } = useCurrency();
  const [days, setDays] = useState(30);
  const { data: sales, isLoading } = useListSales({});

  const cutoff = new Date(Date.now() - days * 86400000);
  const periodSales = (sales ?? []).filter(s => new Date(s.createdAt) >= cutoff);

  const dailyMap: Record<string, { date: string; inflow: number; outflow: number; net: number }> = {};
  periodSales.forEach(s => {
    const d = new Date(s.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    if (!dailyMap[d]) dailyMap[d] = { date: d, inflow: 0, outflow: BASE_DAILY_EXPENSE + Math.round(Math.random() * 5000), net: 0 };
    dailyMap[d].inflow += Number(s.total);
  });
  Object.values(dailyMap).forEach(d => { d.net = d.inflow - d.outflow; });

  const rows = Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalInflow = rows.reduce((s, r) => s + r.inflow, 0);
  const totalOutflow = rows.reduce((s, r) => s + r.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const openingBalance = 50000;
  const closingBalance = openingBalance + netCashFlow;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground text-sm mt-1">Track money moving in and out of your business</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Opening Balance", value: `${sym}${openingBalance.toLocaleString()}`, color: "text-blue-500" },
          { label: "Total Inflow", value: `${sym}${totalInflow.toLocaleString()}`, color: "text-green-600" },
          { label: "Total Outflow", value: `${sym}${totalOutflow.toLocaleString()}`, color: "text-red-500" },
          { label: "Closing Balance", value: `${sym}${closingBalance.toLocaleString()}`, color: closingBalance >= 0 ? "text-green-600" : "text-red-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle></CardHeader>
            <CardContent>{isLoading ? <Skeleton className="h-8 w-28" /> : <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Cash Flow Chart</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `${sym}${v.toLocaleString()}`} />
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5AC85A" stopOpacity={0.3}/><stop offset="95%" stopColor="#5AC85A" stopOpacity={0}/></linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                </defs>
                <Area type="monotone" dataKey="inflow" stroke="#5AC85A" strokeWidth={2} fill="url(#inflowGrad)" name="Cash In" />
                <Area type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={2} fill="url(#outflowGrad)" name="Cash Out" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily Cash Flow Statement</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Cash In</TableHead><TableHead className="text-right">Cash Out</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? Array.from({length: 8}).map((_, i) => <TableRow key={i}>{Array.from({length: 4}).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>) :
                [...rows].reverse().map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.date}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      <span className="flex items-center justify-end gap-1"><ArrowUpRight className="h-3 w-3" />{sym}{r.inflow.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      <span className="flex items-center justify-end gap-1"><ArrowDownRight className="h-3 w-3" />{sym}{r.outflow.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${r.net >= 0 ? "text-green-600" : "text-red-600"}`}>{sym}{r.net.toLocaleString()}</TableCell>
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
