import { useListPurchaseOrders, useCreatePurchaseOrder, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function PurchaseOrders() {
  const { data: purchaseOrders, isLoading } = useListPurchaseOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return (
    <UpgradeGate required="pro" featureName="Purchase Orders">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage supplier orders.</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> New PO</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">No purchase orders found</TableCell></TableRow>
              ) : purchaseOrders?.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">PO-{String(po.id).padStart(4, '0')}</TableCell>
                  <TableCell>{format(new Date(po.createdAt), 'PP')}</TableCell>
                  <TableCell>
                    <Badge variant={po.status === 'received' ? 'default' : 'secondary'} className="capitalize">{po.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${po.totalCost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </UpgradeGate>
  );
}
