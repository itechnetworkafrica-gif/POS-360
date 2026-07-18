import { useState } from "react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useListProducts, useListStores } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transfer { id: string; date: string; fromStore: string; toStore: string; product: string; quantity: number; status: "pending" | "completed" | "cancelled"; }

const mockTransfers: Transfer[] = [
  { id: "1", date: new Date(Date.now() - 86400000).toISOString(), fromStore: "Main Street Branch", toStore: "Victoria Island Outlet", product: "Coca-Cola 50cl", quantity: 50, status: "completed" },
  { id: "2", date: new Date(Date.now() - 2 * 86400000).toISOString(), fromStore: "Abuja Central", toStore: "Main Street Branch", product: "USB-C Cable 1m", quantity: 20, status: "completed" },
  { id: "3", date: new Date().toISOString(), fromStore: "Main Street Branch", toStore: "Abuja Central", product: "Dettol Soap 120g", quantity: 30, status: "pending" },
];

export default function StockTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>(mockTransfers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fromStoreId: "", toStoreId: "", productId: "", quantity: 1 });
  const { data: stores } = useListStores();
  const { data: products } = useListProducts({});
  const { toast } = useToast();

  const save = () => {
    const fromStore = (stores ?? []).find(s => String(s.id) === form.fromStoreId)?.name ?? "Unknown";
    const toStore = (stores ?? []).find(s => String(s.id) === form.toStoreId)?.name ?? "Unknown";
    const product = (products ?? []).find(p => String(p.id) === form.productId)?.name ?? "Unknown";
    setTransfers(prev => [{ id: Date.now().toString(), date: new Date().toISOString(), fromStore, toStore, product, quantity: form.quantity, status: "pending" }, ...prev]);
    setOpen(false);
    toast({ title: "Transfer request created" });
  };

  const statusColor: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  return (
    <UpgradeGate required="pro" featureName="Stock Transfers">
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground text-sm mt-1">Transfer inventory between stores</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="hidden sm:table-cell">Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate max-w-[100px]">{t.fromStore}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[100px]">{t.toStore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{t.product}</TableCell>
                    <TableCell className="text-right font-bold">{t.quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status]}`}>{t.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>From Store</Label>
              <Select value={form.fromStoreId} onValueChange={v => setForm(f => ({ ...f, fromStoreId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source store" /></SelectTrigger>
                <SelectContent>{(stores ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>To Store</Label>
              <Select value={form.toStoreId} onValueChange={v => setForm(f => ({ ...f, toStoreId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select destination store" /></SelectTrigger>
                <SelectContent>{(stores ?? []).filter(s => String(s.id) !== form.fromStoreId).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{(products ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.fromStoreId || !form.toStoreId || !form.productId}>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </UpgradeGate>
  );
}
