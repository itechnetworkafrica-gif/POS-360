import { useGetStore, useUpdateStore, getGetStoreQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function StoreDetails() {
  const { data: store, isLoading } = useGetStore(1);
  const update = useUpdateStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<any>(null);

  if (store && !form) setForm(store);
  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (!form) return null;

  const set = (key: string, value: string) => setForm((f: any) => ({ ...f, [key]: value }));

  const save = () => {
    update.mutate({ id: 1, data: form }, {
      onSuccess: () => {
        toast({ title: "Store details saved" });
        queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey(1) });
      },
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Store Details</h1>
          <p className="text-muted-foreground text-sm mt-1">Physical store information displayed on receipts</p>
        </div>
        <Button onClick={save} disabled={update.isPending}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Store Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-2 grid gap-2"><Label>Store Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} /></div>
          <div className="col-span-2 grid gap-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={e => set("address", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Tax Rate (%)</Label><Input type="number" min={0} max={100} step={0.5} value={form.taxRate ?? ""} onChange={e => set("taxRate", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Receipt Customization</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2"><Label>Receipt Header Text</Label><Input value={form.receiptHeader ?? ""} onChange={e => set("receiptHeader", e.target.value)} placeholder="Store name, tagline..." /></div>
          <div className="grid gap-2"><Label>Receipt Footer Text</Label><Input value={form.receiptFooter ?? ""} onChange={e => set("receiptFooter", e.target.value)} placeholder="Thank you message..." /></div>
        </CardContent>
      </Card>
    </div>
  );
}
