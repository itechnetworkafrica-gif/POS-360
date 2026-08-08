import { useListStores, useCreateStore, getListStoresQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Plus, MapPin, Phone, Globe } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Stores() {
  const { data: stores, isLoading } = useListStores();
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground">Manage your multi-store locations.</p>
        </div>
        <StoreFormDialog mode="create" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores?.map(store => (
          <Card key={store.id} className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center text-xl">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  {store.name}
                </CardTitle>
                {store.isActive ? (
                  <Badge className="bg-emerald-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{store.address || "No address set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{store.phone || "No phone set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <span>{store.timezone} • {store.currency}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/20">
              <Button variant="outline" className="w-full">Manage Settings</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StoreFormDialog({ mode, store }: { mode: 'create' | 'edit', store?: any }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(store || {
    name: "",
    currency: "USD",
    timezone: "UTC",
    phone: "",
    address: "",
    email: ""
  });
  
  const createMutation = useCreateStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (mode === 'create') {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => {
          toast({ title: "Store created successfully" });
          queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
          setOpen(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button><Plus className="h-4 w-4 mr-2" /> Add Store</Button>
        ) : (
          <Button variant="outline" size="sm">Edit</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Store' : 'Edit Store'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Store Name</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Input value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Input value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
