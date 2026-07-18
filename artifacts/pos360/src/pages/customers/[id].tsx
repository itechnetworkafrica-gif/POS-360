import { useGetCustomer, useGetCustomerPurchaseHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "wouter";
import { User, Mail, Phone, MapPin, Calendar, CreditCard, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CustomerDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: customer, isLoading: loadingCustomer } = useGetCustomer(id, { query: { enabled: !!id, queryKey: [] as any } });
  const { data: history, isLoading: loadingHistory } = useGetCustomerPurchaseHistory(id, { query: { enabled: !!id, queryKey: [] as any } });

  if (loadingCustomer) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!customer) return <div className="p-6">Customer not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground">Customer Profile & History</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address || "No address"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{customer.birthday ? format(new Date(customer.birthday), 'PP') : "No birthday"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Value & Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <div className="text-3xl font-bold flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-primary" />
                  ${customer.totalSpent.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Visits</p>
                <div className="text-3xl font-bold flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                  {customer.visitCount}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Loyalty Points</p>
                <div className="text-3xl font-bold flex items-center">
                  <Badge variant="secondary" className="text-xl px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 hover:bg-amber-100">
                    {customer.loyaltyPoints}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>Recent transactions for this customer</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt No</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingHistory ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
              ) : history?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No purchases found.</TableCell></TableRow>
              ) : history?.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.createdAt), 'PP p')}</TableCell>
                  <TableCell className="font-mono text-xs">{sale.receiptNumber || `SALE-${sale.id}`}</TableCell>
                  <TableCell className="capitalize">{sale.paymentMethod.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
