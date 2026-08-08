import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Percent, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

interface Discount { id: string; name: string; type: "percent" | "fixed"; value: number; active: boolean; }

const initial: Discount[] = [
  { id: "1", name: "10% Off", type: "percent", value: 10, active: true },
  { id: "2", name: "Staff Discount", type: "percent", value: 20, active: true },
  { id: "3", name: "Happy Hour", type: "percent", value: 15, active: false },
  { id: "4", name: "Loyalty Reward", type: "fixed", value: 500, active: true },
  { id: "5", name: "New Customer", type: "fixed", value: 1000, active: true },
];

const empty = (): Discount => ({ id: "", name: "", type: "percent", value: 0, active: true });

export default function Discounts() {
  const { sym } = useCurrency();
  const [discounts, setDiscounts] = useState<Discount[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState<Discount>(empty());
  const { toast } = useToast();

  const openNew = () => { setEditing(null); setForm(empty()); setOpen(true); };
  const openEdit = (d: Discount) => { setEditing(d); setForm({ ...d }); setOpen(true); };

  const save = () => {
    if (!form.name.trim() || form.value <= 0) return;
    if (editing) {
      setDiscounts(prev => prev.map(d => d.id === editing.id ? { ...form, id: editing.id } : d));
    } else {
      setDiscounts(prev => [...prev, { ...form, id: Date.now().toString() }]);
    }
    setOpen(false);
    toast({ title: `Discount ${editing ? "updated" : "created"}` });
  };

  const remove = (id: string) => { setDiscounts(prev => prev.filter(d => d.id !== id)); toast({ title: "Discount deleted" }); };
  const toggle = (id: string) => setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage discounts available at the POS</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Discount</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {d.type === "percent" ? <Percent className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                        {d.type === "percent" ? "Percentage" : "Fixed Amount"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {d.type === "percent" ? `${d.value}%` : `${sym}${d.value.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={d.active} onCheckedChange={() => toggle(d.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
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
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Discount</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2"><Label>Discount Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 10% Off" /></div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="flex rounded-lg border overflow-hidden">
                {(["percent", "fixed"] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {t === "percent" ? "Percentage" : "Fixed Amount"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{form.type === "percent" ? "Percentage (%)" : "Amount ({sym})"}</Label>
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} min={0} max={form.type === "percent" ? 100 : undefined} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Active at POS</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
