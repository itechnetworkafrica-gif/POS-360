import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Store, CreditCard, Receipt, Settings2, Save } from "lucide-react";
import { useGetStore, useUpdateStore, getGetStoreQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const storeId = 1; // Default
  const { data: store, isLoading } = useGetStore(storeId);
  const updateStore = useUpdateStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>(null);

  // Initialize form when data loads
  if (store && !formData) {
    setFormData(store);
  }

  const handleSave = () => {
    if (!formData) return;
    
    updateStore.mutate({ id: storeId, data: formData }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey(storeId) });
      }
    });
  };

  if (isLoading || !formData) return <div className="p-6 text-center">Loading settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage store preferences and details.</p>
        </div>
        <Button onClick={handleSave} disabled={updateStore.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Store className="mr-2 h-5 w-5" /> Store Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Store Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Regional Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Input value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Default Tax Rate (%)</Label>
              <Input type="number" value={formData.taxRate || 0} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Receipt className="mr-2 h-5 w-5" /> Receipt Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Header Text</Label>
              <Input value={formData.receiptHeader || ''} onChange={e => setFormData({...formData, receiptHeader: e.target.value})} placeholder="Thank you for your business!" />
            </div>
            <div className="grid gap-2">
              <Label>Footer Text</Label>
              <Input value={formData.receiptFooter || ''} onChange={e => setFormData({...formData, receiptFooter: e.target.value})} placeholder="Please come again" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
