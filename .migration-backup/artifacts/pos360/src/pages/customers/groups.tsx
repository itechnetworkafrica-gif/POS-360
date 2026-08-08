import { useListCustomerGroups, useCreateCustomerGroup, getListCustomerGroupsQueryKey } from "@workspace/api-client-react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CustomerGroups() {
  const { data: groups, isLoading } = useListCustomerGroups();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return (
    <UpgradeGate required="pro" featureName="Customer Groups">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Groups</h1>
          <p className="text-muted-foreground">Manage loyalty tiers and group discounts.</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Group</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead className="text-right">Discount %</TableHead>
                <TableHead className="text-right">Loyalty Multiplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">No groups found</TableCell></TableRow>
              ) : groups?.map(group => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-right">{group.discountPercent}%</TableCell>
                  <TableCell className="text-right">{group.loyaltyMultiplier}x</TableCell>
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
