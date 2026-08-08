import { useGetEmployee, useGetEmployeeTimeEntries, getGetEmployeeQueryKey } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams } from "wouter";
import { User, Mail, Phone, Clock, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function EmployeeDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: employee, isLoading: loadingEmployee } = useGetEmployee(id, { query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) } });
  const { data: timeEntries, isLoading: loadingTimeEntries } = useGetEmployeeTimeEntries(id, { query: { enabled: !!id, queryKey: [] as any } });

  if (loadingEmployee) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!employee) return <div className="p-6">Employee not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-muted-foreground">Employee Profile & Time Entries</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="capitalize">{employee.role}</Badge>
              {employee.isActive ? (
                <Badge className="bg-emerald-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{employee.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{employee.phone || "No phone"}</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-1">PIN Code</p>
              <p className="font-mono">{employee.pin}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <div className="text-3xl font-bold flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                  {employee.totalSales || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" /> Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead className="text-right">Hours Worked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTimeEntries ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
              ) : timeEntries?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No time entries found.</TableCell></TableRow>
              ) : timeEntries?.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.clockIn), 'PP')}</TableCell>
                  <TableCell>{format(new Date(entry.clockIn), 'p')}</TableCell>
                  <TableCell>{entry.clockOut ? format(new Date(entry.clockOut), 'p') : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell className="text-right font-medium">{entry.hoursWorked?.toFixed(2) || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
