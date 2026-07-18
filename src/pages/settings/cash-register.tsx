import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

export default function CashRegisterSettings() {
  const { sym } = useCurrency();
  const [form, setForm] = useState({
    requireOpeningBalance: true,
    openingBalance: 50000,
    requireClosingCount: true,
    cashDrawerPort: "COM1",
    printerType: "thermal_80mm",
    printerPort: "USB001",
    requirePinOnSale: false,
    requirePinAmount: 10000,
    allowNegativeStock: false,
    showProductImages: true,
    gridColumns: "4",
    defaultTaxRate: "7.5",
    roundingMethod: "nearest_naira",
  });
  const { toast } = useToast();

  const set = (key: string, value: string | boolean | number) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cash Register</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure POS terminal behavior</p>
        </div>
        <Button onClick={() => toast({ title: "Cash register settings saved" })}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" />Cash Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Require Opening Balance</Label><p className="text-xs text-muted-foreground">Cashier must enter opening cash before selling</p></div><Switch checked={form.requireOpeningBalance} onCheckedChange={v => set("requireOpeningBalance", v)} /></div>
          {form.requireOpeningBalance && (
            <div className="grid gap-2"><Label>Default Opening Balance ({sym})</Label><Input type="number" value={form.openingBalance} onChange={e => set("openingBalance", parseFloat(e.target.value))} className="max-w-[150px]" /></div>
          )}
          <div className="flex items-center justify-between"><div><Label>Require Cash Count at Close</Label><p className="text-xs text-muted-foreground">Cashier must count cash before closing shift</p></div><Switch checked={form.requireClosingCount} onCheckedChange={v => set("requireClosingCount", v)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>POS Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Show Product Images</Label><p className="text-xs text-muted-foreground">Display product photos on POS grid</p></div><Switch checked={form.showProductImages} onCheckedChange={v => set("showProductImages", v)} /></div>
          <div className="grid gap-2">
            <Label>Product Grid Columns</Label>
            <Select value={form.gridColumns} onValueChange={v => set("gridColumns", v)}>
              <SelectTrigger className="max-w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
                <SelectItem value="5">5 columns</SelectItem>
                <SelectItem value="6">6 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Default Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} step={0.5} value={form.defaultTaxRate} onChange={e => set("defaultTaxRate", e.target.value)} className="max-w-[150px]" />
          </div>
          <div className="grid gap-2">
            <Label>Price Rounding</Label>
            <Select value={form.roundingMethod} onValueChange={v => set("roundingMethod", v)}>
              <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Rounding</SelectItem>
                <SelectItem value="nearest_naira">Nearest Naira</SelectItem>
                <SelectItem value="nearest_5">Nearest {sym}5</SelectItem>
                <SelectItem value="nearest_10">Nearest {sym}10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Require PIN for Discounts</Label><p className="text-xs text-muted-foreground">Manager PIN required to approve discounts</p></div><Switch checked={form.requirePinOnSale} onCheckedChange={v => set("requirePinOnSale", v)} /></div>
          {form.requirePinOnSale && (
            <div className="grid gap-2"><Label>Minimum Amount Requiring PIN ({sym})</Label><Input type="number" value={form.requirePinAmount} onChange={e => set("requirePinAmount", parseFloat(e.target.value))} className="max-w-[150px]" /></div>
          )}
          <div className="flex items-center justify-between"><div><Label>Allow Negative Stock</Label><p className="text-xs text-muted-foreground">Sell items even when stock reaches zero</p></div><Switch checked={form.allowNegativeStock} onCheckedChange={v => set("allowNegativeStock", v)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hardware</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Cash Drawer Port</Label>
            <Select value={form.cashDrawerPort} onValueChange={v => set("cashDrawerPort", v)}>
              <SelectTrigger className="max-w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COM1">COM1</SelectItem>
                <SelectItem value="COM2">COM2</SelectItem>
                <SelectItem value="USB">USB</SelectItem>
                <SelectItem value="Network">Network</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Receipt Printer Type</Label>
            <Select value={form.printerType} onValueChange={v => set("printerType", v)}>
              <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal_80mm">Thermal 80mm</SelectItem>
                <SelectItem value="thermal_58mm">Thermal 58mm</SelectItem>
                <SelectItem value="inkjet">Inkjet/Laser</SelectItem>
                <SelectItem value="none">No Printer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
