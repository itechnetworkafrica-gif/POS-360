import { useGetProductsReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCurrency } from "@/context/currency";

export default function ReportByItem() {
  const { sym } = useCurrency();
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useGetProductsReport({});

  const filtered = (products ?? []).filter(p => p.productName.toLowerCase().includes(search.toLowerCase()));
  const top10 = (products ?? []).slice(0, 10);
  const totalRevenue = (products ?? []).reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sales by Item</h1>
          <p className="text-muted-foreground text-sm mt-1">Product-level sales performance</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{sym}{totalRevenue.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unique Products Sold</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(products ?? []).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Units Sold</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(products ?? []).reduce((s, p) => s + p.quantitySold, 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top 10 Products by Revenue</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${sym}${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="productName" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                <Tooltip formatter={(v: number) => [`${sym}${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#5AC85A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Profit</TableHead>
                  <TableHead className="hidden md:table-cell text-right">In Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{item.categoryName || "—"}</TableCell>
                    <TableCell className="text-right">{item.quantitySold}</TableCell>
                    <TableCell className="text-right font-bold">{sym}{item.revenue.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-green-600">{item.profit != null ? `${sym}${(item.profit as number).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{item.stockQuantity}</TableCell>
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
