import { useState } from "react";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useListCustomerGroups, useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, Star, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

export default function LoyaltyProgram() {
  const { sym } = useCurrency();
  const [enabled, setEnabled] = useState(true);
  const [pointsPerNaira, setPointsPerNaira] = useState(1);
  const [redeemRate, setRedeemRate] = useState(100);
  const { data: groups, isLoading: groupsLoading } = useListCustomerGroups();
  const { data: customers, isLoading: customersLoading } = useListCustomers({});
  const { toast } = useToast();

  const topCustomers = [...(customers ?? [])]
    .sort((a, b) => Number(b.loyaltyPoints) - Number(a.loyaltyPoints))
    .slice(0, 10);

  const totalPoints = (customers ?? []).reduce((s, c) => s + Number(c.loyaltyPoints), 0);
  const totalValue = Math.floor(totalPoints / redeemRate);

  const handleSave = () => toast({ title: "Loyalty program settings saved" });

  return (
    <UpgradeGate required="pro" featureName="Loyalty Program">
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Loyalty Program</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure customer rewards and points</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: customers?.length ?? 0, icon: Users, color: "text-blue-500" },
          { label: "Points Issued", value: totalPoints.toLocaleString(), icon: Star, color: "text-yellow-500" },
          { label: "Redeemable Value", value: `${sym}${totalValue.toLocaleString()}`, icon: Gift, color: "text-green-500" },
          { label: "Avg Points/Member", value: customers?.length ? Math.round(totalPoints / customers.length).toLocaleString() : "0", icon: TrendingUp, color: "text-purple-500" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {customersLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-xl font-bold">{kpi.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Program Settings</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Loyalty Program</Label>
                <p className="text-sm text-muted-foreground mt-0.5">Award points on every purchase</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="grid gap-2">
              <Label>Points earned per {sym}1 spent</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={pointsPerNaira} min={0.1} step={0.1} onChange={e => setPointsPerNaira(parseFloat(e.target.value))} className="max-w-[120px]" />
                <span className="text-sm text-muted-foreground">points / {sym}1</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Points needed to redeem {sym}1</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={redeemRate} min={1} onChange={e => setRedeemRate(parseInt(e.target.value))} className="max-w-[120px]" />
                <span className="text-sm text-muted-foreground">points = {sym}1</span>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">Save Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Group Multipliers</CardTitle></CardHeader>
          <CardContent>
            {groupsLoading ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-3">
                {(groups ?? []).map(g => (
                  <div key={g.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.discountPercent}% discount</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                      <Star className="h-3.5 w-3.5" />
                      {g.loyaltyMultiplier}x
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Loyalty Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Total Spent</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="text-right font-bold text-yellow-600 flex items-center justify-end gap-1"><Star className="h-3 w-3" />{Number(c.loyaltyPoints).toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{sym}{Number(c.totalSpent).toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{c.visitCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    </UpgradeGate>
  );
}
