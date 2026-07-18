import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCurrency } from "@/context/currency";

const COLORS = ["#5AC85A", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];

export default function CashRegister() {
  const { sym } = useCurrency();
  const { data: sales, isLoading } = useListSales({});

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = (sales ?? []).filter(s => new Date(s.createdAt) >= today);

  const paymentBreakdown: Record<string, number> = {};
  let totalCash = 0, totalCard = 0, totalMobile = 0, totalRevenue = 0;
  todaySales.forEach(s => {
    const amt = Number(s.total);
    totalRevenue += amt;
    paymentBreakdown[s.paymentMethod] = (paymentBreakdown[s.paymentMethod] ?? 0) + amt;
    if (s.paymentMethod === "cash") totalCash += amt;
    else if (s.paymentMethod === "card") totalCard += amt;
    else totalMobile += amt;
  });

  const pieData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name: name.replace("_", " ").toUpperCase(), value }));

  const openingBalance = 50000;
  const closingBalance = openingBalance + totalCash;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cash Register</h1>
        <p className="text-muted-foreground text-sm mt-1">Today's cash register summary — {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Opening Balance", value: `${sym}${openingBalance.toLocaleString()}`, color: "text-blue-500" },
          { label: "Cash Sales", value: `${sym}${totalCash.toLocaleString()}`, color: "text-green-500" },
          { label: "Closing Balance", value: `${sym}${closingBalance.toLocaleString()}`, color: "text-purple-500" },
          { label: "Total Revenue", value: `${sym}${totalRevenue.toLocaleString()}`, color: "text-orange-500" },
        ].map(item => (
          <Card key={item.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Method Breakdown</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${sym}${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Today's Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Cash Transactions", count: todaySales.filter(s => s.paymentMethod === "cash").length, amount: totalCash },
                { label: "Card Transactions", count: todaySales.filter(s => s.paymentMethod === "card").length, amount: totalCard },
                { label: "Mobile Money", count: todaySales.filter(s => s.paymentMethod === "mobile_money").length, amount: totalMobile },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.count} transactions</p>
                  </div>
                  <div className="text-right font-bold">{sym}{item.amount.toLocaleString()}</div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold">
                <span>Total</span>
                <span>{sym}{totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
