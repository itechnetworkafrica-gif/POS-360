import { useListEmployees } from "@/lib/api-client";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Timer } from "lucide-react";
import { useState } from "react";

const mockEntries = [
  { id: 1, employeeId: 1, employeeName: "Oluwaseun Adeyemi", clockIn: new Date(Date.now() - 8 * 3600000).toISOString(), clockOut: new Date(Date.now() - 1 * 3600000).toISOString(), hoursWorked: 7 },
  { id: 2, employeeId: 2, employeeName: "Ngozi Obi", clockIn: new Date(Date.now() - 9 * 3600000).toISOString(), clockOut: new Date(Date.now() - 2 * 3600000).toISOString(), hoursWorked: 7 },
  { id: 3, employeeId: 3, employeeName: "Kelechi Eze", clockIn: new Date(Date.now() - 6 * 3600000).toISOString(), clockOut: null, hoursWorked: null },
  { id: 4, employeeId: 1, employeeName: "Oluwaseun Adeyemi", clockIn: new Date(Date.now() - 32 * 3600000).toISOString(), clockOut: new Date(Date.now() - 25 * 3600000).toISOString(), hoursWorked: 7 },
  { id: 5, employeeId: 4, employeeName: "Amina Sule", clockIn: new Date(Date.now() - 10 * 3600000).toISOString(), clockOut: new Date(Date.now() - 3 * 3600000).toISOString(), hoursWorked: 7 },
  { id: 6, employeeId: 5, employeeName: "Tunde Bakare", clockIn: new Date(Date.now() - 56 * 3600000).toISOString(), clockOut: new Date(Date.now() - 49 * 3600000).toISOString(), hoursWorked: 7 },
];

export default function TimeEntries() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const { data: employees, isLoading } = useListEmployees({});

  const filtered = selectedEmployee === "all" ? mockEntries : mockEntries.filter(e => String(e.employeeId) === selectedEmployee);
  const totalHours = filtered.reduce((s, e) => s + (e.hoursWorked ?? 0), 0);

  return (
    <UpgradeGate required="pro" featureName="Time Entries">
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Time Entries</h1>
          <p className="text-muted-foreground text-sm mt-1">Employee clock-in and clock-out records</p>
        </div>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {(employees ?? []).map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Entries</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalHours}h</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Currently Clocked In</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.filter(e => !e.clockOut).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-sm">{entry.employeeName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(entry.clockIn).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {entry.clockOut ? new Date(entry.clockOut).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold">{entry.hoursWorked !== null ? `${entry.hoursWorked}h` : "—"}</TableCell>
                    <TableCell>
                      {entry.clockOut
                        ? <Badge variant="secondary">Completed</Badge>
                        : <Badge className="bg-green-500 text-white animate-pulse">Active</Badge>}
                    </TableCell>
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
