import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaxRate { id: string; name: string; rate: number; appliedTo: string; inclusive: boolean; active: boolean; }

const initial: TaxRate[] = [
  { id: "1", name: "Standard VAT", rate: 7.5, appliedTo: "all", inclusive: false, active: true },
  { id: "2", name: "Service Charge", rate: 10, appliedTo: "food", inclusive: false, active: false },
  { id: "3", name: "Zero Rated", rate: 0, appliedTo: "exempt", inclusive: false, active: true },
];

export default function TaxSettings() {
  const [taxes, setTaxes] = useState<TaxRate[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<Omit<TaxRate, "id">>({ name: "", rate: 0, appliedTo: "all", inclusive: false, active: true });
  const [taxInclusive, setTaxInclusive] = useState(false);
  const { toast } = useToast();

  const openEdit = (t: TaxRate) => { setEditing(t); setForm({ name: t.name, rate: t.rate, appliedTo: t.appliedTo, inclusive: t.inclusive, active: t.active }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ name: "", rate: 0, appliedTo: "all", inclusive: false, active: true }); setOpen(true); };

  const save = () => {
    if (!form.name) return;
    if (editing) setTaxes(prev => prev.map(t => t.id === editing.id ? { ...form, id: editing.id } : t));
    else setTaxes(prev => [...prev, { ...form, id: Date.now().toString() }]);
    setOpen(false); toast({ title: `Tax ${editing ? "updated" : "created"}` });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tax Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure tax rates for your business</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Tax Rate</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Global Tax Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Prices include tax</Label><p className="text-xs text-muted-foreground">All prices are displayed and entered inclusive of tax</p></div>
            <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tax Rates</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="hidden sm:table-cell">Applied To</TableHead><TableHead className="text-center">Active</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
              <TableBody>
                {taxes.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{t.rate}%</TableCell>
                    <TableCell className="hidden sm:table-cell capitalize text-muted-foreground text-sm">{t.appliedTo}</TableCell>
                    <TableCell className="text-center"><Switch checked={t.active} onCheckedChange={() => setTaxes(p => p.map(x => x.id === t.id ? { ...x, active: !x.active } : x))} /></TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTaxes(p => p.filter(x => x.id !== t.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div></TableCell>
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
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Rate (%)</Label><Input type="number" min={0} max={100} step={0.5} value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="grid gap-2">
              <Label>Applied To</Label>
              <Select value={form.appliedTo} onValueChange={v => setForm(f => ({ ...f, appliedTo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Items</SelectItem><SelectItem value="food">Food & Beverages</SelectItem><SelectItem value="services">Services</SelectItem><SelectItem value="exempt">Tax Exempt</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.inclusive} onCheckedChange={v => setForm(f => ({ ...f, inclusive: v }))} /><Label>Price inclusive</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
