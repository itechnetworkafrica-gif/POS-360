import {
  useListTables, useCreateTable, useUpdateTable, useDeleteTable, getListTablesQueryKey
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Users, ChefHat, Edit2, Trash2, Clock, CircleDot,
  LayoutGrid, RefreshCw, Utensils, Coffee
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────
type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
const STATUS_CYCLE: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];

function nextStatus(current: TableStatus): TableStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

// ─── Status Config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TableStatus, {
  label: string;
  dot: string;
  card: string;
  badge: string;
  glow: string;
}> = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    card: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500/70",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    glow: "shadow-emerald-200 dark:shadow-emerald-900/50",
  },
  occupied: {
    label: "Occupied",
    dot: "bg-red-500",
    card: "border-red-500 bg-red-50 dark:bg-red-950/40 dark:border-red-500/70",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    glow: "shadow-red-200 dark:shadow-red-900/50",
  },
  reserved: {
    label: "Reserved",
    dot: "bg-amber-500",
    card: "border-amber-500 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-500/70",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    glow: "shadow-amber-200 dark:shadow-amber-900/50",
  },
  cleaning: {
    label: "Cleaning",
    dot: "bg-blue-500",
    card: "border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500/70",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    glow: "shadow-blue-200 dark:shadow-blue-900/50",
  },
};

// ─── Timer Hook ───────────────────────────────────────────────────────
function useTableTimers(tableIds: number[], occupiedIds: number[]) {
  // occupancyStart[id] = timestamp when this table became occupied
  const [occupancyStart, setOccupancyStart] = useState<Record<number, number>>({});
  const [ticks, setTicks] = useState(0);

  // When a table becomes occupied, record start time
  useEffect(() => {
    setOccupancyStart(prev => {
      const next = { ...prev };
      occupiedIds.forEach(id => { if (!next[id]) next[id] = Date.now(); });
      // Clean up released tables
      Object.keys(next).forEach(key => {
        if (!occupiedIds.includes(Number(key))) delete next[Number(key)];
      });
      return next;
    });
  }, [JSON.stringify(occupiedIds)]);

  // Tick every second so timers re-render
  useEffect(() => {
    const id = setInterval(() => setTicks(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const getElapsed = (tableId: number): string => {
    const start = occupancyStart[tableId];
    if (!start) return "0:00";
    const secs = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getElapsedMinutes = (tableId: number): number => {
    const start = occupancyStart[tableId];
    if (!start) return 0;
    return Math.floor((Date.now() - start) / 60000);
  };

  return { getElapsed, getElapsedMinutes };
}

// ─── Table Card ───────────────────────────────────────────────────────
function TableCard({
  table, onStatusChange, onEdit, onDelete, elapsed, elapsedMinutes,
}: {
  table: any;
  onStatusChange: (id: number, status: TableStatus) => void;
  onEdit: (table: any) => void;
  onDelete: (id: number) => void;
  elapsed: string;
  elapsedMinutes: number;
}) {
  const cfg = STATUS_CONFIG[table.status as TableStatus] ?? STATUS_CONFIG.available;
  const [menuOpen, setMenuOpen] = useState(false);

  // Urgent color when occupied > 90 mins
  const urgent = table.status === "occupied" && elapsedMinutes >= 90;

  return (
    <div
      className={`relative rounded-xl border-2 p-4 flex flex-col gap-3 cursor-pointer select-none transition-all duration-200 hover:shadow-lg active:scale-95 ${cfg.card} ${urgent ? "animate-pulse" : ""}`}
      style={{ boxShadow: `0 4px 14px -4px var(--tw-shadow-color)` }}
      onClick={() => onStatusChange(table.id, nextStatus(table.status))}
    >
      {/* Dot indicator */}
      <div className={`absolute top-3 right-3 h-2.5 w-2.5 rounded-full ${cfg.dot} ${table.status === "occupied" ? "animate-pulse" : ""}`} />

      {/* Table name */}
      <div className="flex items-center gap-2">
        <Coffee className={`h-4 w-4 ${table.status === "available" ? "text-emerald-600" : table.status === "occupied" ? "text-red-600" : table.status === "reserved" ? "text-amber-600" : "text-blue-600"} dark:opacity-80`} />
        <span className="font-bold text-base tracking-tight">{table.name}</span>
      </div>

      {/* Capacity */}
      <div className="flex items-center gap-1.5 text-sm opacity-75">
        <Users className="h-3.5 w-3.5" />
        <span>{table.capacity ?? 4} seats</span>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full self-start ${cfg.badge}`}>
        <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>

      {/* Timer for occupied tables */}
      {table.status === "occupied" && (
        <div className={`flex items-center gap-1.5 text-xs font-mono font-bold ${urgent ? "text-red-600" : "text-muted-foreground"}`}>
          <Clock className="h-3 w-3" />
          {elapsed}
          {urgent && <span className="text-red-600 ml-1 font-semibold">⚠ Long wait</span>}
        </div>
      )}

      {/* Action buttons — show on hover */}
      <div className="flex gap-1 mt-auto" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => onEdit(table)}>
          <Edit2 className="h-3 w-3" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(table.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Add/Edit Dialog ──────────────────────────────────────────────────
function TableFormDialog({
  mode, table, open, onOpenChange
}: { mode: "create" | "edit"; table?: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({ name: table?.name ?? "", capacity: table?.capacity ?? 4, status: table?.status ?? "available" });
  const createMutation = useCreateTable();
  const updateMutation = useUpdateTable();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setForm({ name: table?.name ?? "", capacity: table?.capacity ?? 4, status: table?.status ?? "available" });
  }, [table, open]);

  const submit = () => {
    const payload = { ...form, storeId: 1, capacity: Number(form.capacity) };
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Table added" });
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
          onOpenChange(false);
        },
      });
    } else {
      updateMutation.mutate({ id: table.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Table updated" });
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Table" : "Edit Table"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Table Name / Number</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. T-12, Booth 4, VIP 1" />
          </div>
          <div className="grid gap-2">
            <Label>Seating Capacity</Label>
            <Input type="number" min={1} max={50} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_CONFIG) as [TableStatus, any][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${v.dot}`} /> {v.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
            {mode === "create" ? "Add Table" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function RestaurantFloor() {
  const { data: tables, isLoading } = useListTables({ storeId: 1 });
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filterStatus, setFilterStatus] = useState<TableStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTable, setEditTable] = useState<any>(null);

  const occupiedIds = (tables ?? []).filter(t => t.status === "occupied").map(t => t.id);
  const { getElapsed, getElapsedMinutes } = useTableTimers((tables ?? []).map(t => t.id), occupiedIds);

  const stats = {
    total: tables?.length ?? 0,
    available: tables?.filter(t => t.status === "available").length ?? 0,
    occupied: tables?.filter(t => t.status === "occupied").length ?? 0,
    reserved: tables?.filter(t => t.status === "reserved").length ?? 0,
    cleaning: tables?.filter(t => t.status === "cleaning").length ?? 0,
  };
  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  const filtered = (tables ?? []).filter(t => filterStatus === "all" || t.status === filterStatus);

  const handleStatusChange = (id: number, status: TableStatus) => {
    const table = tables?.find(t => t.id === id);
    if (!table) return;
    updateTable.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() }),
    });
  };

  const handleDelete = (id: number) => {
    deleteTable.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Table removed" });
        queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
      },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" /> Floor Plan
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Click a table to cycle its status • Real-time occupancy timers</p>
        </div>
        <div className="flex gap-2">
          <Link href="/restaurant/kitchen">
            <Button variant="outline" size="sm" className="gap-2">
              <ChefHat className="h-4 w-4" /> Kitchen Display
            </Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => { setEditTable(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Table
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-muted/50" },
          { label: "Available", value: stats.available, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Occupied", value: stats.occupied, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Reserved", value: stats.reserved, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Cleaning", value: stats.cleaning, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Occupancy Rate</span>
          <span className="font-semibold">{occupancyRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${occupancyRate > 80 ? "bg-red-500" : occupancyRate > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>

      {/* Legend + Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", ...STATUS_CYCLE] as const).map(s => {
          const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${filterStatus === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}
            >
              {cfg && <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />}
              {s === "all" ? "All Tables" : cfg!.label}
              {s !== "all" && <span className="ml-0.5 opacity-70">({stats[s]})</span>}
            </button>
          );
        })}
      </div>

      {/* Table Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array(12).fill(0).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Utensils className="h-12 w-12 opacity-20" />
          <p className="text-sm">{filterStatus === "all" ? "No tables yet. Add your first table." : `No ${filterStatus} tables.`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
          {filtered.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
              onEdit={t => { setEditTable(t); setDialogOpen(true); }}
              onDelete={handleDelete}
              elapsed={getElapsed(table.id)}
              elapsedMinutes={getElapsedMinutes(table.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <TableFormDialog
        mode={editTable ? "edit" : "create"}
        table={editTable}
        open={dialogOpen}
        onOpenChange={v => { setDialogOpen(v); if (!v) setEditTable(null); }}
      />
    </div>
  );
}
