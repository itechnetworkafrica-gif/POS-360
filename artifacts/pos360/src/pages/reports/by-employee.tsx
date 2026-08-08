import { useGetEmployeesReport } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCurrency } from "@/context/currency";

const roleColor: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  cashier: "bg-green-100 text-green-800",
  kitchen: "bg-orange-100 text-orange-800",
};

export default function ReportByEmployee() {
  const { sym } = useCurrency();
  const { data: employees, isLoading } = useGetEmployeesReport({});
  const sorted = [...(employees ?? [])].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const totalRevenue = sorted.reduce((s, e) => s + e.totalRevenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales by Employee</h1>
        <p className="text-muted-foreground text-sm mt-1">Individual employee sales performance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-24" /> : <div className="text-2xl font-bold">{sym}{totalRevenue.toLocaleString()}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{sorted.reduce((s, e) => s + e.totalSales, 0)}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Hours Worked</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{sorted.reduce((s, e) => s + (e.hoursWorked ?? 0), 0).toFixed(1)}h</div>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue by Employee</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sorted.filter(e => e.totalRevenue > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="employeeName" stroke="hsl(var(--muted-foreground))" fontSize={11} tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="totalRevenue" fill="#5AC85A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Avg Order</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : sorted.map((e, i) => (
                  <TableRow key={e.employeeId}>
                    <TableCell className="text-muted-foreground font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{e.employeeName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColor[e.role as string] ?? "bg-gray-100 text-gray-700"}`}>{e.role}</span>
                    </TableCell>
                    <TableCell className="text-right">{e.totalSales}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{e.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{sym}{(e.averageOrderValue ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{(e.hoursWorked ?? 0).toFixed(1)}h</TableCell>
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
