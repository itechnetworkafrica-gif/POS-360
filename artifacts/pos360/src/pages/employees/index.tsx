import {
  useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, User as UserIcon, Camera, Loader2, X, ShieldCheck } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Role badge colours ───────────────────────────────────────────────
const ROLE_STYLES: Record<string, string> = {
  owner:   "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  cashier: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  kitchen: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

// ─── Role access descriptions ─────────────────────────────────────────
const ROLE_ACCESS: Record<string, string[]> = {
  owner:   ["Full access to all features, settings, reports, billing, and employees"],
  manager: ["POS, sales, inventory, customers, employees, reports, restaurant"],
  cashier: ["POS terminal, sales history, product lookup, basic inventory view"],
  kitchen: ["Kitchen display only — view and update ticket status"],
};

// ─── Avatar upload helper ─────────────────────────────────────────────
async function uploadAvatar(file: File): Promise<string> {
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return `/api${objectPath}`;
}

function AvatarPicker({ name, value, onChange }: { name: string; value: string; onChange: (url: string) => void }) {
  const inputRef       = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const initials = name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 3 MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setPreview(URL.createObjectURL(file));
      onChange(url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative h-20 w-20 rounded-full border-2 border-dashed border-border hover:border-primary/60 cursor-pointer overflow-hidden flex items-center justify-center bg-muted transition-colors"
      >
        {preview ? (
          <img src={preview} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-muted-foreground">{initials}</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full">
          {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
        </div>
        {preview && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setPreview(""); onChange(""); }}
            className="absolute top-0 right-0 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        )}
      </div>
      <span className="text-xs text-muted-foreground">Click to upload photo</span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

// ─── Employee form dialog ─────────────────────────────────────────────
function EmployeeFormDialog({ mode, employee, onClose }: { mode: "create" | "edit"; employee?: any; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => employee
    ? { name: employee.name ?? "", email: employee.email ?? "", phone: employee.phone ?? "",
        role: employee.role ?? "cashier", pin: employee.pin ?? "", isActive: employee.isActive ?? true,
        avatarUrl: employee.avatarUrl ?? "" }
    : { name: "", email: "", phone: "", role: "cashier", pin: "", isActive: true, avatarUrl: "" });

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();
  const isPending      = createMutation.isPending || updateMutation.isPending;

  const close = () => { setOpen(false); onClose?.(); };

  const submit = () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (!form.email.trim()) { toast({ title: "Email required", variant: "destructive" }); return; }
    if (mode === "create" && !form.pin) { toast({ title: "PIN required", variant: "destructive" }); return; }

    const payload = { ...form, storeId: 1 };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });

    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Employee added ✓" }); invalidate(); close(); },
        onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Error adding employee", variant: "destructive" }),
      });
    } else {
      updateMutation.mutate({ id: employee.id, data: payload }, {
        onSuccess: () => { toast({ title: "Employee updated ✓" }); invalidate(); close(); },
        onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Error updating employee", variant: "destructive" }),
      });
    }
  };

  const roleAccess = ROLE_ACCESS[form.role] ?? [];

  return (
    <>
      {mode === "create"
        ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
        : <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>}

      <Dialog open={open} onOpenChange={v => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add Employee" : "Edit Employee"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Avatar */}
            <AvatarPicker
              name={form.name}
              value={form.avatarUrl}
              onChange={url => setForm(f => ({ ...f, avatarUrl: url }))}
            />

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Amara Johnson" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="work@email.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+234..." value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            {/* Role + PIN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Login PIN <span className="text-destructive">*</span></Label>
                <Input
                  type="password" placeholder="4–6 digits"
                  value={form.pin} maxLength={6}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
            </div>

            {/* Role access info */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Access for {form.role} role:
              </div>
              {roleAccess.map((line, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {line}</p>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Can this employee log in?</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close} disabled={isPending}>Cancel</Button>
            <Button onClick={submit} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Add Employee" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Employees page ────────────────────────────────────────────────────
export default function Employees() {
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useListEmployees({ storeId: 1 });
  const deleteEmployee = useDeleteEmployee();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this employee? They will no longer be able to log in.")) return;
    deleteEmployee.mutate({ id }, {
      onSuccess: () => { toast({ title: "Employee removed" }); queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() }); },
    });
  };

  const filtered = (employees ?? []).filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your staff, roles, and access</p>
        </div>
        <EmployeeFormDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : !filtered.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <UserIcon className="h-10 w-10 opacity-30" />
              <div className="text-center">
                <p className="font-medium">{search ? "No employees match your search" : "No employees yet"}</p>
                {!search && <p className="text-sm mt-1">Add your first employee with the button above.</p>}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id} className="group">
                    <TableCell>
                      {(emp as any).avatarUrl ? (
                        <img src={(emp as any).avatarUrl} alt={emp.name}
                          className="h-9 w-9 rounded-full object-cover border" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {emp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/employees/${emp.id}`}>
                        <span className="font-medium text-sm hover:text-primary cursor-pointer">{emp.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_STYLES[emp.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {emp.role}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{emp.email ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{emp.pin}</TableCell>
                    <TableCell>
                      {emp.isActive
                        ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[11px]">Active</Badge>
                        : <Badge variant="secondary" className="text-[11px]">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <EmployeeFormDialog mode="edit" employee={emp} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
