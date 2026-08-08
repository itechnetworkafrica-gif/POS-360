import { useListSales, useListProducts } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

export default function InventoryHistory() {
  const [search, setSearch] = useState("");
  const { data: sales, isLoading: salesLoading } = useListSales({});
  const { data: products, isLoading: productsLoading } = useListProducts({});
  const isLoading = salesLoading || productsLoading;

  const productMap: Record<number, string> = {};
  (products ?? []).forEach(p => { productMap[p.id] = p.name; });

  // Build stock movement history from sale items
  const movements: Array<{ id: string; date: string; productName: string; change: number; type: "sale" | "adjustment" | "purchase"; reference: string }> = [];

  (sales ?? []).forEach(sale => {
    (sale.items ?? []).forEach((item: any) => {
      movements.push({
        id: `${sale.id}-${item.id}`,
        date: sale.createdAt,
        productName: item.productName,
        change: -Number(item.quantity),
        type: "sale",
        reference: sale.receiptNumber ?? "",
      });
    });
  });

  movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = movements.filter(m =>
    m.productName.toLowerCase().includes(search.toLowerCase()) ||
    m.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory History</h1>
          <p className="text-muted-foreground text-sm mt-1">Stock movement history across all items</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by product or reference..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Reference</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.slice(0, 100).map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(m.date).toLocaleDateString("en-NG")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{m.productName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={m.type === "sale" ? "secondary" : m.type === "purchase" ? "default" : "outline"} className="text-xs capitalize">
                        {m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{m.reference}</TableCell>
                    <TableCell className="text-right">
                      <span className={`flex items-center justify-end gap-1 font-bold text-sm ${m.change < 0 ? "text-red-500" : "text-green-500"}`}>
                        {m.change < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {Math.abs(m.change)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Showing 100 of {filtered.length} records</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
