import { useListSales } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrency } from "@/context/currency";

const paymentBadgeColor: Record<string, string> = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  card: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  mobile_money: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function Receipts() {
  const { sym } = useCurrency();
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const { data: sales, isLoading } = useListSales({});

  const filtered = (sales ?? []).filter(s =>
    (s.receiptNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    s.paymentMethod.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground text-sm mt-1">All completed sales transactions</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search receipts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                )) : filtered.slice().reverse().map(sale => (
                  <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs font-medium">{sale.receiptNumber}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentBadgeColor[sale.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                        {sale.paymentMethod.replace("_", " ").toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={sale.status === "completed" ? "default" : "destructive"}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{sym}{Number(sale.total).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSale(sale)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt {selectedSale?.receiptNumber}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="text-center border rounded-lg p-4 bg-muted/30">
                <p className="font-bold text-lg">Gotecx POS</p>
                <p className="text-xs text-muted-foreground">{new Date(selectedSale.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                {(selectedSale.items ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.productName} × {item.quantity}</span>
                    <span>{sym}{Number(item.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{sym}{Number(selectedSale.subtotal).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>{sym}{Number(selectedSale.taxAmount).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{sym}{Number(selectedSale.total).toLocaleString()}</span></div>
              </div>
              <div className="text-center text-xs text-muted-foreground">Payment: {selectedSale.paymentMethod.replace("_"," ").toUpperCase()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
