import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingDown, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency";

const categories = ["Rent", "Utilities", "Salaries", "Supplies", "Marketing", "Maintenance", "Transport", "Insurance", "Other"];

interface Expense { id: string; date: string; description: string; category: string; amount: number; reference: string; }

const seed: Expense[] = [
  { id: "1", date: new Date(Date.now() - 2 * 86400000).toISOString(), description: "Monthly store rent", category: "Rent", amount: 150000, reference: "EXP-001" },
  { id: "2", date: new Date(Date.now() - 5 * 86400000).toISOString(), description: "Electricity bill - IKEDC", category: "Utilities", amount: 28000, reference: "EXP-002" },
  { id: "3", date: new Date(Date.now() - 7 * 86400000).toISOString(), description: "Staff salaries - June", category: "Salaries", amount: 280000, reference: "EXP-003" },
  { id: "4", date: new Date(Date.now() - 10 * 86400000).toISOString(), description: "POS paper rolls and bags", category: "Supplies", amount: 15000, reference: "EXP-004" },
  { id: "5", date: new Date(Date.now() - 14 * 86400000).toISOString(), description: "Facebook/Instagram ads", category: "Marketing", amount: 25000, reference: "EXP-005" },
  { id: "6", date: new Date(Date.now() - 15 * 86400000).toISOString(), description: "Generator fuel", category: "Utilities", amount: 18000, reference: "EXP-006" },
  { id: "7", date: new Date(Date.now() - 20 * 86400000).toISOString(), description: "AC servicing", category: "Maintenance", amount: 35000, reference: "EXP-007" },
];

const catColors: Record<string, string> = {
  Rent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Utilities: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Salaries: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Supplies: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  Maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function Expenses() {
  const { sym } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>(seed);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "Rent", amount: "", reference: "", notes: "" });
  const { toast } = useToast();

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.amount, 0);
  const byCategory = categories.reduce((acc, cat) => { acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0); return acc; }, {} as Record<string, number>);
  const topCat = Object.entries(byCategory).sort(([,a],[,b]) => b - a)[0];

  const save = () => {
    if (!form.description || !form.amount) return;
    const newExp: Expense = { id: Date.now().toString(), date: new Date().toISOString(), description: form.description, category: form.category, amount: parseFloat(form.amount), reference: form.reference || `EXP-${String(expenses.length + 1).padStart(3, "0")}` };
    setExpenses(prev => [newExp, ...prev]);
    setOpen(false);
    setForm({ description: "", category: "Rent", amount: "", reference: "", notes: "" });
    toast({ title: "Expense recorded" });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle><TrendingDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{sym}{total.toLocaleString()}</div><p className="text-xs text-muted-foreground">All time</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Month</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{sym}{thisMonth.toLocaleString()}</div></CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Top Category</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{topCat?.[0]}</div><div className="text-sm text-muted-foreground">{sym}{topCat?.[1]?.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="hidden sm:table-cell">Category</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium text-sm">{e.description}</TableCell>
                    <TableCell className="hidden sm:table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColors[e.category] ?? catColors.Other}`}>{e.category}</span></TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">{e.reference}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{sym}{e.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="e.g. Monthly rent" /></div>
            <div className="grid gap-2"><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Amount ({sym})</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="0.00" /></div>
            <div className="grid gap-2"><Label>Reference (optional)</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="Invoice number, receipt..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save Expense</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
