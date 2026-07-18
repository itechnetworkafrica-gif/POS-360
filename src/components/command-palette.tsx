import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent
} from "@/components/ui/dialog";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings,
  Coffee, TrendingUp, UserCheck, Plug, Receipt, Clock, ShieldCheck,
  Tag, Percent, History, ArrowLeftRight, Star, CreditCard, Monitor,
  ChefHat, Globe, FileText, DollarSign, ShoppingBag, Users2,
  Calculator, TrendingDown, Wallet, HelpCircle, Store, Keyboard, Search
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  // Core
  { id: "dashboard",    label: "Dashboard",           href: "/",                        icon: LayoutDashboard, group: "Navigation" },
  { id: "pos",          label: "POS Screen",           href: "/pos",                     icon: ShoppingCart,    group: "Navigation", keywords: ["cashier", "sell", "point of sale"] },
  { id: "billing",      label: "Billing & Plans",      href: "/billing",                 icon: CreditCard,      group: "Navigation" },
  { id: "help",         label: "Help Center",          href: "/help",                    icon: HelpCircle,      group: "Navigation" },
  // Sales
  { id: "sales",        label: "Sales Summary",        href: "/sales",                   icon: BarChart3,       group: "Sales" },
  { id: "receipts",     label: "Receipts",             href: "/sales/receipts",          icon: Receipt,         group: "Sales" },
  { id: "shifts",       label: "Shifts",               href: "/sales/shifts",            icon: Clock,           group: "Sales" },
  { id: "cashreg",      label: "Cash Register",        href: "/sales/cash-register",     icon: DollarSign,      group: "Sales" },
  // Items
  { id: "products",     label: "Items / Products",     href: "/inventory/products",      icon: ShoppingBag,     group: "Inventory", keywords: ["product", "stock", "item"] },
  { id: "categories",   label: "Categories",           href: "/inventory/categories",    icon: Tag,             group: "Inventory" },
  { id: "modifiers",    label: "Modifiers",            href: "/inventory/modifiers",     icon: Settings,        group: "Inventory" },
  { id: "discounts",    label: "Discounts",            href: "/inventory/discounts",     icon: Percent,         group: "Inventory" },
  { id: "taxes",        label: "Taxes",                href: "/inventory/taxes",         icon: FileText,        group: "Inventory" },
  { id: "invhistory",   label: "Inventory History",    href: "/inventory/history",       icon: History,         group: "Inventory" },
  { id: "pos-orders",   label: "Purchase Orders",      href: "/inventory/purchase-orders",icon: ShoppingBag,    group: "Inventory" },
  { id: "suppliers",    label: "Suppliers",            href: "/inventory/suppliers",     icon: Users2,          group: "Inventory" },
  { id: "transfers",    label: "Stock Transfers",      href: "/inventory/transfers",     icon: ArrowLeftRight,  group: "Inventory" },
  // Customers
  { id: "customers",    label: "Customers",            href: "/customers",               icon: Users,           group: "Customers" },
  { id: "cust-groups",  label: "Customer Groups",      href: "/customers/groups",        icon: Users2,          group: "Customers" },
  { id: "loyalty",      label: "Loyalty Program",      href: "/customers/loyalty",       icon: Star,            group: "Customers" },
  // Employees
  { id: "employees",    label: "Employees",            href: "/employees",               icon: UserCheck,       group: "Employees" },
  { id: "time-entries", label: "Time Entries",         href: "/employees/time-entries",  icon: Clock,           group: "Employees" },
  { id: "access",       label: "Access Rights",        href: "/employees/access",        icon: ShieldCheck,     group: "Employees" },
  // Restaurant
  { id: "floor",        label: "Floor Plan",           href: "/restaurant",              icon: Coffee,          group: "Restaurant" },
  { id: "kitchen",      label: "Kitchen Display",      href: "/restaurant/kitchen",      icon: ChefHat,         group: "Restaurant" },
  // Reports
  { id: "r-item",       label: "Sales by Item",        href: "/reports/by-item",         icon: ShoppingBag,     group: "Reports" },
  { id: "r-category",   label: "Sales by Category",    href: "/reports/by-category",     icon: Tag,             group: "Reports" },
  { id: "r-employee",   label: "Sales by Employee",    href: "/reports/by-employee",     icon: UserCheck,       group: "Reports" },
  { id: "r-payment",    label: "Sales by Payment",     href: "/reports/by-payment",      icon: CreditCard,      group: "Reports" },
  { id: "r-customer",   label: "Sales by Customer",    href: "/reports/by-customer",     icon: Users,           group: "Reports" },
  { id: "r-cash",       label: "Cash Drawer Report",   href: "/reports/cash-drawer",     icon: DollarSign,      group: "Reports" },
  // Accounting
  { id: "pl",           label: "P&L Overview",         href: "/accounting",              icon: BarChart3,       group: "Accounting" },
  { id: "income",       label: "Income",               href: "/accounting/income",       icon: TrendingUp,      group: "Accounting" },
  { id: "expenses",     label: "Expenses",             href: "/accounting/expenses",     icon: TrendingDown,    group: "Accounting" },
  { id: "cashflow",     label: "Cash Flow",            href: "/accounting/cash-flow",    icon: Wallet,          group: "Accounting" },
  // Settings
  { id: "stores",       label: "Stores",               href: "/stores",                  icon: Store,           group: "Settings" },
  { id: "integrations", label: "Integrations",         href: "/integrations",            icon: Plug,            group: "Settings" },
  { id: "s-general",    label: "General Settings",     href: "/settings/general",        icon: Globe,           group: "Settings" },
  { id: "s-store",      label: "Store Details",        href: "/settings/store",          icon: Store,           group: "Settings" },
  { id: "s-receipts",   label: "Receipt Settings",     href: "/settings/receipts",       icon: Receipt,         group: "Settings" },
  { id: "s-taxes",      label: "Tax Settings",         href: "/settings/taxes",          icon: Percent,         group: "Settings" },
  { id: "s-payments",   label: "Payment Types",        href: "/settings/payment-types",  icon: CreditCard,      group: "Settings" },
  { id: "s-register",   label: "Cash Register Settings",href: "/settings/cash-register", icon: Monitor,         group: "Settings" },
  { id: "s-kitchen",    label: "Kitchen Settings",     href: "/settings/kitchen",        icon: ChefHat,         group: "Settings" },
];

const GROUPS = ["Navigation", "Sales", "Inventory", "Customers", "Employees", "Restaurant", "Reports", "Accounting", "Settings"];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) { setQuery(""); setFocused(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase())) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const grouped = GROUPS.reduce<Record<string, CommandItem[]>>((acc, g) => {
    const items = filtered.filter(c => c.group === g);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  const select = (item: CommandItem) => {
    navigate(item.href);
    onOpenChange(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, flatFiltered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); if (flatFiltered[focused]) select(flatFiltered[focused]); }
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, focused, flatFiltered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            placeholder="Search pages, settings, reports..."
            value={query}
            onChange={e => { setQuery(e.target.value); setFocused(0); }}
          />
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">↑↓</kbd>
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">↵</kbd>
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">Esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {flatFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">No results for "{query}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => {
              const groupStart = flatFiltered.indexOf(items[0]);
              return (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30">
                    {group}
                  </div>
                  {items.map((item, localIdx) => {
                    const globalIdx = groupStart + localIdx;
                    const Icon = item.icon;
                    const isFocused = focused === globalIdx;
                    return (
                      <button
                        key={item.id}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                        onMouseEnter={() => setFocused(globalIdx)}
                        onClick={() => select(item)}
                      >
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${isFocused ? "bg-primary/20" : "bg-muted"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                        </div>
                        {isFocused && <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-background font-mono shrink-0">↵</kbd>}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-3 text-[11px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          Press <kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">Ctrl+K</kbd> to open anytime
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
