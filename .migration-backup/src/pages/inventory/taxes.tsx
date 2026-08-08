import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tax { id: string; name: string; rate: number; inclusive: boolean; active: boolean; }

const initial: Tax[] = [
  { id: "1", name: "VAT (Standard)", rate: 7.5, inclusive: false, active: true },
  { id: "2", name: "Service Charge", rate: 10, inclusive: false, active: false },
  { id: "3", name: "Zero Rated", rate: 0, inclusive: false, active: true },
];

export default function Taxes() {
  const [taxes, setTaxes] = useState<Tax[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [form, setForm] = useState<Omit<Tax, "id">>({ name: "", rate: 0, inclusive: false, active: true });
  const { toast } = useToast();

  const openNew = () => { setEditing(null); setForm({ name: "", rate: 0, inclusive: false, active: true }); setOpen(true); };
  const openEdit = (t: Tax) => { setEditing(t); setForm({ name: t.name, rate: t.rate, inclusive: t.inclusive, active: t.active }); setOpen(true); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setTaxes(prev => prev.map(t => t.id === editing.id ? { ...form, id: editing.id } : t));
    } else {
      setTaxes(prev => [...prev, { ...form, id: Date.now().toString() }]);
    }
    setOpen(false);
    toast({ title: `Tax ${editing ? "updated" : "created"}` });
  };

  const remove = (id: string) => { setTaxes(prev => prev.filter(t => t.id !== id)); toast({ title: "Tax deleted" }); };
  const toggle = (id: string) => setTaxes(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Taxes</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure tax rates applied to sales</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Tax</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Name</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Inclusive</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{t.rate}%</TableCell>
                    <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground">{t.inclusive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-center"><Switch checked={t.active} onCheckedChange={() => toggle(t.id)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Tax Rate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2"><Label>Tax Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. VAT, Service Charge" /></div>
            <div className="grid gap-2"><Label>Rate (%)</Label><Input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} min={0} max={100} step={0.5} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.inclusive} onCheckedChange={v => setForm(f => ({ ...f, inclusive: v }))} /><Label>Price inclusive of tax</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><Label>Active</Label></div>
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
