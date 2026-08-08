import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, User } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search: search || undefined });
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure?")) {
      deleteCustomer.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Customer deleted" });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        }
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships and loyalty.</p>
        </div>
        <CustomerFormDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Loyalty Points</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.email || "-"}</div>
                    <div className="text-xs text-muted-foreground">{customer.phone || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-amber-600">{customer.loyaltyPoints}</TableCell>
                  <TableCell className="text-right">${customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CustomerFormDialog mode="edit" customer={customer} />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerFormDialog({ mode, customer }: { mode: 'create' | 'edit', customer?: any }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(customer || {
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (mode === 'create') {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => {
          toast({ title: "Customer created" });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          setOpen(false);
        }
      });
    } else {
      updateMutation.mutate({ id: customer.id, data: formData }, {
        onSuccess: () => {
          toast({ title: "Customer updated" });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          setOpen(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
        ) : (
          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Customer' : 'Edit Customer'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
