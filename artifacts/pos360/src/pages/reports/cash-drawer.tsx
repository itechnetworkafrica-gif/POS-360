import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { useCurrency } from "@/context/currency";

export default function CashDrawerReport() {
  const { sym } = useCurrency();
  const [days, setDays] = useState(7);
  const { data: sales, isLoading } = useListSales({});

  const cutoff = new Date(Date.now() - days * 86400000);
  const cashSales = (sales ?? []).filter(s => s.paymentMethod === "cash" && new Date(s.createdAt) >= cutoff);

  const dailyMap: Record<string, { date: string; openBalance: number; cashIn: number; cashOut: number; closeBalance: number; transactions: number }> = {};
  let runningBalance = 50000;

  const byDate: Record<string, number> = {};
  cashSales.forEach(s => {
    const date = new Date(s.createdAt).toLocaleDateString("en-NG");
    byDate[date] = (byDate[date] ?? 0) + Number(s.total);
  });

  const rows = Object.entries(byDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, cashIn]) => {
      const openBalance = runningBalance;
      runningBalance += cashIn;
      return { date, openBalance, cashIn, cashOut: 0, closeBalance: runningBalance, transactions: cashSales.filter(s => new Date(s.createdAt).toLocaleDateString("en-NG") === date).length };
    })
    .reverse();

  const totalCashIn = rows.reduce((s, r) => s + r.cashIn, 0);
  const currentBalance = rows.length > 0 ? rows[0].closeBalance : 50000;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cash Drawer</h1>
          <p className="text-muted-foreground text-sm mt-1">Cash flow and drawer balance history</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>{d}d</Button>
          ))}
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold text-green-600">{sym}{currentBalance.toLocaleString()}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Cash In ({days}d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{sym}{totalCashIn.toLocaleString()}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Cash Out ({days}d)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{sym}0</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Cash Summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Cash Out</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.date}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{sym}{r.openBalance.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">+{sym}{r.cashIn.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-red-500">{sym}{r.cashOut.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{r.closeBalance.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-muted-foreground">{r.transactions}</TableCell>
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
