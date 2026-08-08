import { useListSales, useListEmployees } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, ShoppingBag, User } from "lucide-react";
import { useCurrency } from "@/context/currency";

export default function Shifts() {
  const { sym } = useCurrency();
  const { data: sales, isLoading: salesLoading } = useListSales({});
  const { data: employees, isLoading: empLoading } = useListEmployees({});
  const isLoading = salesLoading || empLoading;

  const empMap: Record<number, string> = {};
  (employees ?? []).forEach(e => { empMap[e.id] = e.name; });

  // Group sales by date to form "shifts"
  const shiftMap: Record<string, { date: string; salesCount: number; revenue: number; cashiers: Set<string>; paymentBreakdown: Record<string, number> }> = {};
  (sales ?? []).forEach(sale => {
    const date = new Date(sale.createdAt).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    if (!shiftMap[date]) shiftMap[date] = { date, salesCount: 0, revenue: 0, cashiers: new Set(), paymentBreakdown: {} };
    shiftMap[date].salesCount++;
    shiftMap[date].revenue += Number(sale.total);
    if (sale.employeeId) shiftMap[date].cashiers.add(empMap[sale.employeeId] ?? `Employee ${sale.employeeId}`);
    const pm = sale.paymentMethod;
    shiftMap[date].paymentBreakdown[pm] = (shiftMap[date].paymentBreakdown[pm] ?? 0) + Number(sale.total);
  });

  const shifts = Object.values(shiftMap).reverse();
  const totalRevenue = shifts.reduce((s, sh) => s + sh.revenue, 0);
  const totalSales = shifts.reduce((s, sh) => s + sh.salesCount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Shifts</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily shift summaries grouped by date</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Shifts", value: shifts.length, icon: Clock, color: "text-blue-500" },
          { label: "Total Sales", value: totalSales, icon: ShoppingBag, color: "text-green-500" },
          { label: "Total Revenue", value: `${sym}${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-purple-500" },
          { label: "Avg per Shift", value: `${sym}${shifts.length > 0 ? Math.round(totalRevenue / shifts.length).toLocaleString() : 0}`, icon: User, color: "text-orange-500" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-xl font-bold">{kpi.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Shift History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Cashiers</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Cash</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Card</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                )) : shifts.map((shift, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{shift.date}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {Array.from(shift.cashiers).slice(0, 2).join(", ")}{shift.cashiers.size > 2 ? ` +${shift.cashiers.size - 2}` : ""}
                    </TableCell>
                    <TableCell className="text-right">{shift.salesCount}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm">{sym}{(shift.paymentBreakdown.cash ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm">{sym}{(shift.paymentBreakdown.card ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{shift.revenue.toLocaleString()}</TableCell>
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
