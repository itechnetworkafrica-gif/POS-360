import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, CreditCard, Banknote, Smartphone, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentType { id: string; name: string; icon: string; enabled: boolean; requiresRef: boolean; opensCashDrawer: boolean; }

const initial: PaymentType[] = [
  { id: "cash", name: "Cash", icon: "💵", enabled: true, requiresRef: false, opensCashDrawer: true },
  { id: "card", name: "Credit / Debit Card", icon: "💳", enabled: true, requiresRef: true, opensCashDrawer: false },
  { id: "mobile_money", name: "Mobile Money (M-Pesa, OPay, etc.)", icon: "📱", enabled: true, requiresRef: true, opensCashDrawer: false },
  { id: "bank_transfer", name: "Bank Transfer", icon: "🏦", enabled: false, requiresRef: true, opensCashDrawer: false },
  { id: "voucher", name: "Voucher / Gift Card", icon: "🎁", enabled: false, requiresRef: true, opensCashDrawer: false },
  { id: "credit", name: "Store Credit", icon: "⭐", enabled: false, requiresRef: false, opensCashDrawer: false },
];

export default function PaymentTypes() {
  const [types, setTypes] = useState<PaymentType[]>(initial);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const toggle = (id: string, field: keyof Pick<PaymentType, "enabled" | "requiresRef" | "opensCashDrawer">) => {
    setTypes(prev => prev.map(t => t.id === id ? { ...t, [field]: !t[field] } : t));
  };

  const addCustom = () => {
    if (!newName.trim()) return;
    setTypes(prev => [...prev, { id: Date.now().toString(), name: newName, icon: "💰", enabled: true, requiresRef: false, opensCashDrawer: false }]);
    setNewName("");
    toast({ title: "Payment type added" });
  };

  const remove = (id: string) => setTypes(prev => prev.filter(t => t.id !== id));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Types</h1>
          <p className="text-muted-foreground text-sm mt-1">Enable the payment methods available at your POS</p>
        </div>
        <Button onClick={() => toast({ title: "Payment settings saved" })}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <div className="space-y-3">
        {types.map(type => (
          <Card key={type.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{type.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{type.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={type.requiresRef} onChange={() => toggle(type.id, "requiresRef")} className="rounded" disabled={!type.enabled} />
                        Req. reference
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={type.opensCashDrawer} onChange={() => toggle(type.id, "opensCashDrawer")} className="rounded" disabled={!type.enabled} />
                        Opens cash drawer
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={type.enabled} onCheckedChange={() => toggle(type.id, "enabled")} />
                  {!["cash", "card", "mobile_money"].includes(type.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(type.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add Custom Payment Type</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="e.g. Cryptocurrency, Check..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} />
            <Button onClick={addCustom}><Plus className="h-4 w-4 mr-2" />Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
