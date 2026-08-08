import { useState } from "react";
import { useGetStore, useUpdateStore } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Receipt, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

export default function ReceiptSettings() {
  const { sym } = useCurrency();
  const { data: store, isLoading } = useGetStore(1);
  const update = useUpdateStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    header: "POS360 — Smart POS",
    footer: "Thank you for your business! See you again soon.",
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showBarcode: false,
    showQR: false,
    autoPrint: false,
    printCopies: 1,
  });

  const set = (key: string, value: string | boolean | number) => setForm(f => ({ ...f, [key]: value }));
  const save = () => toast({ title: "Receipt settings saved" });

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Receipt Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize how receipts look for customers</p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Header & Footer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Receipt Header</Label>
                <Textarea rows={3} value={form.header} onChange={e => set("header", e.target.value)} placeholder="Store name, tagline..." />
              </div>
              <div className="grid gap-2">
                <Label>Receipt Footer</Label>
                <Textarea rows={3} value={form.footer} onChange={e => set("footer", e.target.value)} placeholder="Thank you message, return policy..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Display Options</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "showLogo", label: "Show Business Logo" },
                { key: "showAddress", label: "Show Store Address" },
                { key: "showPhone", label: "Show Phone Number" },
                { key: "showBarcode", label: "Show Barcode" },
                { key: "showQR", label: "Show QR Code" },
                { key: "autoPrint", label: "Auto-print after each sale" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label>{item.label}</Label>
                  <Switch checked={form[item.key as keyof typeof form] as boolean} onCheckedChange={v => set(item.key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Print Settings</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Label>Number of Copies</Label>
              <Input type="number" min={1} max={3} value={form.printCopies} onChange={e => set("printCopies", parseInt(e.target.value))} className="max-w-[100px]" />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Receipt Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-950 font-mono text-sm space-y-2 shadow-inner">
              <div className="text-center space-y-1">
                {form.showLogo && <div className="text-2xl">🏪</div>}
                <p className="font-bold text-base">{form.header || "Your Store Name"}</p>
                {form.showAddress && <p className="text-xs text-gray-500">123 Main Street, Lagos</p>}
                {form.showPhone && <p className="text-xs text-gray-500">+234 801 234 5678</p>}
              </div>
              <div className="border-t border-dashed pt-2 mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Receipt: RCP-001</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Coca-Cola 50cl × 2</span><span>{sym}500</span></div>
                  <div className="flex justify-between text-xs"><span>Indomie Noodles × 1</span><span>{sym}150</span></div>
                </div>
              </div>
              <div className="border-t border-dashed pt-2 space-y-1">
                <div className="flex justify-between text-xs"><span>Subtotal</span><span>{sym}650</span></div>
                <div className="flex justify-between text-xs"><span>Tax (7.5%)</span><span>{sym}49</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{sym}699</span></div>
              </div>
              <div className="border-t border-dashed pt-2 text-center">
                <p className="text-xs text-gray-500">{form.footer}</p>
                {form.showBarcode && <div className="mt-2 text-xs text-gray-400">|||||| ||| |||||| |||</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
