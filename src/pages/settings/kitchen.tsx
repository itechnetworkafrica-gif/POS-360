import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function KitchenSettings() {
  const [form, setForm] = useState({
    enabled: true,
    autoSendToKitchen: true,
    alertSound: true,
    alertSoundType: "bell",
    displayColumns: "2",
    orderTimeout: 15,
    showCustomerName: true,
    showTableNumber: true,
    showOrderTime: true,
    groupByTable: false,
    printKitchenTickets: false,
    printCopies: 1,
  });
  const { toast } = useToast();

  const set = (key: string, value: string | boolean | number) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kitchen Display</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure the Kitchen Display System (KDS)</p>
        </div>
        <Button onClick={() => toast({ title: "Kitchen settings saved" })}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" />Kitchen Display Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label className="text-base">Enable Kitchen Display</Label><p className="text-sm text-muted-foreground">Show orders on kitchen screen</p></div><Switch checked={form.enabled} onCheckedChange={v => set("enabled", v)} /></div>
          <div className="flex items-center justify-between"><div><Label>Auto-send Orders to Kitchen</Label><p className="text-xs text-muted-foreground">Send immediately when items are added to ticket</p></div><Switch checked={form.autoSendToKitchen} onCheckedChange={v => set("autoSendToKitchen", v)} /></div>
          <div className="grid gap-2">
            <Label>Display Columns</Label>
            <Select value={form.displayColumns} onValueChange={v => set("displayColumns", v)}>
              <SelectTrigger className="max-w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 column</SelectItem>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Order Timeout Alert (minutes)</Label>
            <Input type="number" min={5} max={60} value={form.orderTimeout} onChange={e => set("orderTimeout", parseInt(e.target.value))} className="max-w-[100px]" />
            <p className="text-xs text-muted-foreground">Orders pending longer than this are highlighted in red</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Display Options</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "showCustomerName", label: "Show Customer Name" },
            { key: "showTableNumber", label: "Show Table Number" },
            { key: "showOrderTime", label: "Show Order Time" },
            { key: "groupByTable", label: "Group Items by Table" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-1.5">
              <Label>{item.label}</Label>
              <Switch checked={form[item.key as keyof typeof form] as boolean} onCheckedChange={v => set(item.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sound Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Enable Sound Alerts</Label><Switch checked={form.alertSound} onCheckedChange={v => set("alertSound", v)} /></div>
          {form.alertSound && (
            <div className="grid gap-2">
              <Label>Alert Sound</Label>
              <Select value={form.alertSoundType} onValueChange={v => set("alertSoundType", v)}>
                <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bell">Bell</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="beep">Beep</SelectItem>
                  <SelectItem value="ding">Ding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kitchen Printer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Print Kitchen Tickets</Label><p className="text-xs text-muted-foreground">Print a ticket for each new order</p></div><Switch checked={form.printKitchenTickets} onCheckedChange={v => set("printKitchenTickets", v)} /></div>
          {form.printKitchenTickets && (
            <div className="grid gap-2"><Label>Print Copies</Label><Input type="number" min={1} max={3} value={form.printCopies} onChange={e => set("printCopies", parseInt(e.target.value))} className="max-w-[100px]" /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
