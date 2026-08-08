import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

interface ModifierOption { id: string; name: string; price: number; }
interface ModifierGroup { id: string; name: string; required: boolean; multiSelect: boolean; options: ModifierOption[]; }

const initial: ModifierGroup[] = [
  { id: "1", name: "Size", required: true, multiSelect: false, options: [{ id: "a", name: "Small", price: 0 }, { id: "b", name: "Medium", price: 500 }, { id: "c", name: "Large", price: 1000 }] },
  { id: "2", name: "Add-ons", required: false, multiSelect: true, options: [{ id: "d", name: "Extra Sauce", price: 200 }, { id: "e", name: "Extra Cheese", price: 350 }] },
  { id: "3", name: "Spice Level", required: false, multiSelect: false, options: [{ id: "f", name: "Mild", price: 0 }, { id: "g", name: "Medium", price: 0 }, { id: "h", name: "Hot", price: 0 }] },
];

export default function Modifiers() {
  const { sym } = useCurrency();
  const [groups, setGroups] = useState<ModifierGroup[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [form, setForm] = useState({ name: "", required: false, multiSelect: false, options: [{ id: Date.now().toString(), name: "", price: 0 }] });
  const { toast } = useToast();

  const openNew = () => { setEditing(null); setForm({ name: "", required: false, multiSelect: false, options: [{ id: Date.now().toString(), name: "", price: 0 }] }); setOpen(true); };
  const openEdit = (g: ModifierGroup) => { setEditing(g); setForm({ name: g.name, required: g.required, multiSelect: g.multiSelect, options: [...g.options] }); setOpen(true); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g));
    } else {
      setGroups(prev => [...prev, { id: Date.now().toString(), ...form }]);
    }
    setOpen(false);
    toast({ title: `Modifier group ${editing ? "updated" : "created"}` });
  };

  const deleteGroup = (id: string) => { setGroups(prev => prev.filter(g => g.id !== id)); toast({ title: "Modifier group deleted" }); };

  const addOption = () => setForm(f => ({ ...f, options: [...f.options, { id: Date.now().toString(), name: "", price: 0 }] }));
  const updateOption = (id: string, field: "name" | "price", value: string | number) => {
    setForm(f => ({ ...f, options: f.options.map(o => o.id === id ? { ...o, [field]: value } : o) }));
  };
  const removeOption = (id: string) => setForm(f => ({ ...f, options: f.options.filter(o => o.id !== id) }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Modifiers</h1>
          <p className="text-muted-foreground text-sm mt-1">Create modifier groups for items (size, add-ons, etc.)</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Modifier Group</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(group => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    {group.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                    {group.multiSelect && <Badge variant="outline" className="text-xs">Multi-select</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(group)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteGroup(group.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.options.map(opt => (
                  <div key={opt.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{opt.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{opt.price > 0 ? `+${sym}${opt.price}` : "Free"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Modifier Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Group Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Size, Add-ons" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} className="rounded" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.multiSelect} onChange={e => setForm(f => ({ ...f, multiSelect: e.target.checked }))} className="rounded" />
                Allow multiple
              </label>
            </div>
            <div>
              <Label className="mb-2 block">Options</Label>
              <div className="space-y-2">
                {form.options.map(opt => (
                  <div key={opt.id} className="flex gap-2">
                    <Input placeholder="Option name" value={opt.name} onChange={e => updateOption(opt.id, "name", e.target.value)} className="flex-1" />
                    <Input placeholder="Price" type="number" value={opt.price} onChange={e => updateOption(opt.id, "price", parseFloat(e.target.value) || 0)} className="w-24" />
                    <Button variant="ghost" size="icon" onClick={() => removeOption(opt.id)} disabled={form.options.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addOption}><Plus className="h-3 w-3 mr-1" />Add Option</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save Changes" : "Create Group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
