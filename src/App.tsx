import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider, useTheme } from "next-themes";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings,
  Coffee, Menu, ChevronDown, Store, TrendingUp, UserCheck,
  Plug, Receipt, Clock, ShieldCheck, Tag, Percent, History, ArrowLeftRight,
  Star, CreditCard, Monitor, ChefHat, Globe, FileText, DollarSign,
  ShoppingBag, Users2, Calculator, TrendingDown, Wallet, Sun, Moon,
  Bell, HelpCircle, AlertTriangle, X, Lock, Zap, Crown, Search,
  LogOut, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useListStores } from "@/lib/api-client";
import { FloatingSupport } from "@/components/floating-support";
import { AuthProvider, useAuth, type Plan, type Role } from "@/context/auth";
import { CurrencyProvider } from "@/context/currency";
import { LoadingScreen } from "@/components/loading-screen";
import { LoginScreen } from "@/components/login-screen";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { useNotifications } from "@/hooks/use-notifications";

// Pages
import Dashboard from "./pages/dashboard";
import POS from "./pages/pos";
import SalesSummary from "./pages/sales/index";
import Receipts from "./pages/sales/receipts";
import Shifts from "./pages/sales/shifts";
import CashRegisterReport from "./pages/sales/cash-register";
import InventoryOverview from "./pages/inventory/index";
import Products from "./pages/inventory/products";
import Categories from "./pages/inventory/categories";
import Suppliers from "./pages/inventory/suppliers";
import PurchaseOrders from "./pages/inventory/purchase-orders";
import Modifiers from "./pages/inventory/modifiers";
import Discounts from "./pages/inventory/discounts";
import TaxesInventory from "./pages/inventory/taxes";
import InventoryHistory from "./pages/inventory/history";
import StockTransfers from "./pages/inventory/transfers";
import Customers from "./pages/customers/index";
import CustomerDetail from "./pages/customers/[id]";
import CustomerGroups from "./pages/customers/groups";
import LoyaltyProgram from "./pages/customers/loyalty";
import Employees from "./pages/employees/index";
import EmployeeDetail from "./pages/employees/[id]";
import TimeEntries from "./pages/employees/time-entries";
import AccessRights from "./pages/employees/access";
import RestaurantFloor from "./pages/restaurant/index";
import KitchenDisplay from "./pages/restaurant/kitchen";
import ReportByItem from "./pages/reports/by-item";
import ReportByCategory from "./pages/reports/by-category";
import ReportByEmployee from "./pages/reports/by-employee";
import ReportByPayment from "./pages/reports/by-payment";
import ReportByCustomer from "./pages/reports/by-customer";
import CashDrawerReport from "./pages/reports/cash-drawer";
import AccountingOverview from "./pages/accounting/index";
import IncomeTracking from "./pages/accounting/income";
import Expenses from "./pages/accounting/expenses";
import CashFlow from "./pages/accounting/cash-flow";
import Stores from "./pages/stores/index";
import GeneralSettings from "./pages/settings/general";
import StoreDetails from "./pages/settings/store";
import ReceiptSettings from "./pages/settings/receipts";
import TaxSettings from "./pages/settings/taxes";
import PaymentTypes from "./pages/settings/payment-types";
import CashRegisterSettings from "./pages/settings/cash-register";
import KitchenSettings from "./pages/settings/kitchen";
import Integrations from "./pages/integrations/index";
import Billing from "./pages/billing/index";
import HelpCenter from "./pages/help/index";

const queryClient = new QueryClient();

// ─── Nav Types ────────────────────────────────────────────────────────
type FeaturePlan = "pro" | "enterprise";
type NavChild = { href: string; label: string; icon?: React.ElementType; plan?: FeaturePlan; roles?: Role[] };
type NavGroup = { label: string; icon: React.ElementType; children: NavChild[]; plan?: FeaturePlan; roles?: Role[] };
type NavLink  = { href: string; label: string; icon: React.ElementType; plan?: FeaturePlan; roles?: Role[] };
type NavItem  = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function roleCanSee(item: { roles?: Role[] }, role: Role | undefined): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (!item.roles) return true; // no role restriction = everyone
  return item.roles.includes(role);
}

const MANAGER_ROLES: Role[] = ["owner", "manager"];
const STAFF_ROLES:   Role[] = ["owner", "manager", "cashier"];

const NAV: NavItem[] = [
  { href: "/",    label: "Dashboard",  icon: LayoutDashboard, roles: MANAGER_ROLES },
  { href: "/pos", label: "POS Screen", icon: ShoppingCart,    roles: STAFF_ROLES },
  {
    label: "Sales", icon: TrendingUp, roles: STAFF_ROLES,
    children: [
      { href: "/sales",               label: "Sales Summary", icon: BarChart3,  roles: STAFF_ROLES },
      { href: "/sales/receipts",      label: "Receipts",      icon: Receipt,    roles: STAFF_ROLES },
      { href: "/sales/shifts",        label: "Shifts",        icon: Clock,      roles: MANAGER_ROLES },
      { href: "/sales/cash-register", label: "Cash Register", icon: DollarSign, roles: MANAGER_ROLES },
    ],
  },
  {
    label: "Items", icon: Package, roles: STAFF_ROLES,
    children: [
      { href: "/inventory/products",        label: "Items",             icon: ShoppingBag,   roles: STAFF_ROLES },
      { href: "/inventory/categories",      label: "Categories",        icon: Tag,           roles: STAFF_ROLES },
      { href: "/inventory/modifiers",       label: "Modifiers",         icon: ChevronDown,   roles: MANAGER_ROLES },
      { href: "/inventory/discounts",       label: "Discounts",         icon: Percent,       roles: MANAGER_ROLES },
      { href: "/inventory/taxes",           label: "Taxes",             icon: FileText,      roles: MANAGER_ROLES },
      { href: "/inventory/history",         label: "Inventory History", icon: History,       roles: MANAGER_ROLES },
      { href: "/inventory/purchase-orders", label: "Purchase Orders",   icon: ShoppingBag,   roles: MANAGER_ROLES, plan: "pro" },
      { href: "/inventory/suppliers",       label: "Suppliers",         icon: Users2,        roles: MANAGER_ROLES },
      { href: "/inventory/transfers",       label: "Stock Transfers",   icon: ArrowLeftRight, roles: MANAGER_ROLES, plan: "pro" },
    ],
  },
  {
    label: "Customers", icon: Users, roles: STAFF_ROLES,
    children: [
      { href: "/customers",         label: "Customers",       icon: Users,  roles: STAFF_ROLES },
      { href: "/customers/groups",  label: "Customer Groups", icon: Users2, roles: MANAGER_ROLES, plan: "pro" },
      { href: "/customers/loyalty", label: "Loyalty Program", icon: Star,   roles: MANAGER_ROLES, plan: "pro" },
    ],
  },
  {
    label: "Employees", icon: UserCheck, roles: MANAGER_ROLES,
    children: [
      { href: "/employees",              label: "Employees",    icon: UserCheck,  roles: MANAGER_ROLES },
      { href: "/employees/time-entries", label: "Time Entries", icon: Clock,      roles: MANAGER_ROLES, plan: "pro" },
      { href: "/employees/access",       label: "Access Rights",icon: ShieldCheck,roles: MANAGER_ROLES, plan: "pro" },
    ],
  },
  {
    label: "Restaurant", icon: Coffee, plan: "pro",
    roles: ["owner", "manager", "kitchen"],
    children: [
      { href: "/restaurant",         label: "Floor Plan",      icon: Coffee,  plan: "pro", roles: MANAGER_ROLES },
      { href: "/restaurant/kitchen", label: "Kitchen Display", icon: ChefHat, plan: "pro", roles: ["owner", "manager", "kitchen"] },
    ],
  },
  {
    label: "Reports", icon: BarChart3, roles: MANAGER_ROLES,
    children: [
      { href: "/reports/by-item",     label: "Sales by Item",     icon: ShoppingBag, roles: MANAGER_ROLES },
      { href: "/reports/by-category", label: "Sales by Category", icon: Tag,         roles: MANAGER_ROLES },
      { href: "/reports/by-employee", label: "Sales by Employee", icon: UserCheck,   roles: MANAGER_ROLES, plan: "pro" },
      { href: "/reports/by-payment",  label: "Sales by Payment",  icon: CreditCard,  roles: MANAGER_ROLES },
      { href: "/reports/by-customer", label: "Sales by Customer", icon: Users,       roles: MANAGER_ROLES, plan: "pro" },
      { href: "/reports/cash-drawer", label: "Cash Drawer",       icon: DollarSign,  roles: MANAGER_ROLES, plan: "pro" },
    ],
  },
  {
    label: "Accounting", icon: Calculator, plan: "pro", roles: MANAGER_ROLES,
    children: [
      { href: "/accounting",           label: "P&L Overview", icon: BarChart3,   plan: "pro", roles: MANAGER_ROLES },
      { href: "/accounting/income",    label: "Income",       icon: TrendingUp,  plan: "pro", roles: MANAGER_ROLES },
      { href: "/accounting/expenses",  label: "Expenses",     icon: TrendingDown,plan: "pro", roles: MANAGER_ROLES },
      { href: "/accounting/cash-flow", label: "Cash Flow",    icon: Wallet,      plan: "pro", roles: MANAGER_ROLES },
    ],
  },
  { href: "/stores",       label: "Stores",       icon: Store,      plan: "enterprise", roles: ["owner"] },
  {
    label: "Settings", icon: Settings, roles: MANAGER_ROLES,
    children: [
      { href: "/settings/general",       label: "General",         icon: Globe,     roles: MANAGER_ROLES },
      { href: "/settings/store",         label: "Store Details",   icon: Store,     roles: MANAGER_ROLES },
      { href: "/settings/receipts",      label: "Receipts",        icon: Receipt,   roles: MANAGER_ROLES },
      { href: "/settings/taxes",         label: "Taxes",           icon: Percent,   roles: MANAGER_ROLES },
      { href: "/settings/payment-types", label: "Payment Types",   icon: CreditCard,roles: MANAGER_ROLES },
      { href: "/settings/cash-register", label: "Cash Register",   icon: Monitor,   roles: MANAGER_ROLES },
      { href: "/settings/kitchen",       label: "Kitchen Display", icon: ChefHat,   roles: MANAGER_ROLES },
    ],
  },
  { href: "/integrations", label: "Integrations", icon: Plug,       plan: "pro",        roles: ["owner"] },
  { href: "/billing",      label: "Billing",      icon: CreditCard,                     roles: ["owner"] },
  { href: "/help",         label: "Help Center",  icon: HelpCircle },
];

// ─── Plan badge chips ─────────────────────────────────────────────────
function PlanBadge({ plan, locked }: { plan: FeaturePlan; locked: boolean }) {
  if (plan === "enterprise") {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide shrink-0 ${locked ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"}`}>
        <Crown className="h-2 w-2" /> ENT
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide shrink-0 ${locked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"}`}>
      <Zap className="h-2 w-2" /> PRO
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────
function isActiveLink(location: string, href: string) {
  if (href === "/") return location === "/";
  return location.startsWith(href);
}
function isGroupActive(location: string, group: NavGroup) {
  return group.children.some(c => isActiveLink(location, c.href));
}

// ─── Notifications ────────────────────────────────────────────────────
const mockNotifications = [
  { id: 1, type: "info",     icon: Bell,           message: "Welcome to POS360! Start by adding your first product.",  time: "just now", read: false },
  { id: 2, type: "stock",    icon: AlertTriangle,  message: "No products added yet — add items to your inventory.",    time: "1 hr ago", read: false },
  { id: 3, type: "customer", icon: Users,          message: "Set up your store details in Settings › Store Details.",  time: "2 hr ago", read: true  },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-9 w-9">
      <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function NotificationBell() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={markAllRead}>Mark all read</Button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map(n => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                className={`flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/50 border-b last:border-0 ${n.read ? "opacity-60" : ""}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "sale" ? "bg-green-100 dark:bg-green-900" : n.type === "stock" ? "bg-orange-100 dark:bg-orange-900" : "bg-blue-100 dark:bg-blue-900"}`}>
                  <Icon className={`h-4 w-4 ${n.type === "sale" ? "text-green-600" : n.type === "stock" ? "text-orange-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? "" : "font-medium"}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs">View all notifications</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────
interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  selectedStore: string;
  onStoreChange: (s: string) => void;
  onLockedClick: (plan: FeaturePlan, feature: string) => void;
}

function SidebarNav({ collapsed = false, onNavigate, selectedStore, onStoreChange, onLockedClick }: SidebarNavProps) {
  const [location] = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV.forEach(item => {
      if (isNavGroup(item) && isGroupActive(location, item)) init[item.label] = true;
    });
    return init;
  });
  const { data: stores } = useListStores();
  const { canAccess, user } = useAuth();
  const userRole = user?.role;
  const visibleNav = NAV.filter(item => roleCanSee(item, userRole)).map(item => {
    if (!isNavGroup(item)) return item;
    return { ...item, children: item.children.filter(c => roleCanSee(c, userRole)) };
  }) as NavItem[];
  const initials = (user?.name ?? "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  const toggleGroup = (label: string) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const renderChild = (child: NavChild) => {
    const childActive = isActiveLink(location, child.href);
    const locked = child.plan ? !canAccess(child.plan) : false;
    const hasBadge = !!child.plan;

    const inner = (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${childActive ? "bg-primary/10 text-primary font-semibold" : locked ? "text-muted-foreground/70 hover:bg-muted/50" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"}`}>
        {child.icon && <child.icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="leading-none flex-1">{child.label}</span>
        {locked && <Lock className="h-3 w-3 shrink-0 opacity-50" />}
        {hasBadge && <PlanBadge plan={child.plan!} locked={locked} />}
      </div>
    );

    if (locked) {
      return (
        <div key={child.href} onClick={() => onLockedClick(child.plan!, child.label)}>
          {inner}
        </div>
      );
    }
    return (
      <Link key={child.href} href={child.href} onClick={onNavigate}>
        {inner}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`h-14 flex items-center border-b border-border px-3 ${collapsed ? "justify-center" : "justify-between"} shrink-0`}>
        {!collapsed
          ? <img src="/logo.png" alt="POS360" className="h-8 w-auto object-contain" />
          : <img src="/logo.png" alt="POS360" className="h-7 w-7 object-contain object-left" />}
      </div>

      {/* Store Switcher */}
      {!collapsed && (
        <div className="p-3 border-b border-border shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-sm h-9">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <span className="truncate">{selectedStore}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Store</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(stores ?? []).map(s => (
                <DropdownMenuItem key={s.id} onClick={() => onStoreChange(s.name)} className={selectedStore === s.name ? "bg-primary/10 text-primary font-medium" : ""}>
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2 shrink-0" />
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleNav.map(item => {
          if (isNavGroup(item)) {
            const active   = isGroupActive(location, item);
            const open     = openGroups[item.label] ?? false;
            const locked   = item.plan ? !canAccess(item.plan) : false;
            const Icon     = item.icon;

            if (collapsed) {
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      title={item.label}
                      className={`relative flex items-center justify-center w-full h-9 rounded-md transition-colors ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.plan && (
                        <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${locked ? "bg-amber-500" : "bg-emerald-500"}`} />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" className="w-52">
                    <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                      {item.label}
                      {item.plan && <PlanBadge plan={item.plan} locked={locked} />}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.children.map(child => {
                      const cLocked = child.plan ? !canAccess(child.plan) : false;
                      if (cLocked) return (
                        <DropdownMenuItem key={child.href} onSelect={() => onLockedClick(child.plan!, child.label)}>
                          <span className="flex items-center gap-2 text-muted-foreground/70">
                            <Lock className="h-3 w-3" /> {child.label}
                            <PlanBadge plan={child.plan!} locked />
                          </span>
                        </DropdownMenuItem>
                      );
                      return (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link href={child.href} onClick={onNavigate}>
                            <span className={`w-full flex items-center justify-between gap-2 ${isActiveLink(location, child.href) ? "text-primary font-semibold" : ""}`}>
                              {child.label}
                              {child.plan && <PlanBadge plan={child.plan} locked={false} />}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (locked) { onLockedClick(item.plan!, item.label); return; }
                    toggleGroup(item.label);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? "text-primary" : locked ? "text-muted-foreground/60 hover:bg-muted/40" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.plan && <PlanBadge plan={item.plan} locked={locked} />}
                  {locked
                    ? <Lock className="h-3.5 w-3.5 opacity-40" />
                    : <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 opacity-60 ${open ? "rotate-180" : ""}`} />}
                </button>
                {!locked && open && (
                  <div className="ml-4 mt-0.5 border-l border-border pl-3 space-y-0.5 mb-0.5">
                    {item.children.map(renderChild)}
                  </div>
                )}
              </div>
            );
          }

          // NavLink
          const active = isActiveLink(location, item.href);
          const locked = item.plan ? !canAccess(item.plan) : false;
          const Icon   = item.icon;

          const linkInner = (
            <div
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm font-medium ${active ? "bg-primary/10 text-primary font-semibold" : locked ? "text-muted-foreground/60 hover:bg-muted/40" : "text-sidebar-foreground hover:bg-sidebar-accent"} ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.plan && <PlanBadge plan={item.plan} locked={locked} />}
                  {locked && <Lock className="h-3.5 w-3.5 opacity-40" />}
                </>
              )}
              {collapsed && item.plan && (
                <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${locked ? "bg-amber-500" : "bg-emerald-500"}`} />
              )}
            </div>
          );

          if (locked) {
            return (
              <div key={item.href} onClick={() => onLockedClick(item.plan!, item.label)}>
                {linkInner}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              {linkInner}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      {!collapsed && user && (
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role} · <span className="capitalize">{user.plan}</span> Plan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState("Main Street Branch");
  const [location] = useLocation();
  const { user, logout, canAccess } = useAuth();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  useNotifications(); // activates push permission + polling
  const userInitials = (user?.name ?? "U").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  // Upgrade dialog state
  const [upgradeOpen, setUpgradeOpen]       = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState<"pro" | "enterprise">("pro");
  const [upgradeFeature, setUpgradeFeature]   = useState("");

  const openUpgrade = (plan: FeaturePlan, feature: string) => {
    setUpgradeRequired(plan);
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  };

  useEffect(() => { setMobileOpen(false); }, [location]);

  const planLabel: Record<string, string> = { starter: "Starter", professional: "Professional", enterprise: "Enterprise" };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${collapsed ? "w-[60px]" : "w-[240px]"} shrink-0`}>
        <SidebarNav
          collapsed={collapsed}
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
          onLockedClick={openUpgrade}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] bg-sidebar">
                <SidebarNav
                  onNavigate={() => setMobileOpen(false)}
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  onLockedClick={openUpgrade}
                />
              </SheetContent>
            </Sheet>

            {/* Desktop collapse */}
            <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" onClick={() => setCollapsed(!collapsed)}>
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile logo */}
            <div className="md:hidden">
              <img src="/logo.png" alt="POS360" className="h-7 w-auto object-contain" />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Store indicator */}
            <div className="hidden sm:flex items-center gap-1.5 mr-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {selectedStore}
            </div>

            {/* Command palette trigger */}
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-xs text-muted-foreground border border-border/60 rounded-md mr-1" onClick={() => setCmdOpen(true)}>
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
            </Button>

            {/* Upgrade CTA — shown for non-enterprise users */}
            {!canAccess("enterprise") && user?.role === "owner" && (
              <Link href="/billing">
                <Button size="sm" className="hidden sm:flex h-8 gap-1.5 px-3 text-xs font-semibold mr-1 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-sm">
                  <Zap className="h-3.5 w-3.5" />
                  {canAccess("pro") ? "Go Enterprise" : "Upgrade"}
                </Button>
              </Link>
            )}

            <ThemeToggle />
            <NotificationBell />

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 ml-1">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {userInitials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user?.plan === "enterprise" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : user?.plan === "professional" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {planLabel[user?.plan ?? "starter"]} Plan
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/settings/general"><User className="h-4 w-4 mr-2" />Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/billing"><CreditCard className="h-4 w-4 mr-2" />Billing</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/help"><HelpCircle className="h-4 w-4 mr-2" />Help Center</Link></DropdownMenuItem>
                {!canAccess("enterprise") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openUpgrade(user?.plan === "starter" ? "pro" : "enterprise", "Enterprise features")} className="text-purple-600 dark:text-purple-400">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative bg-background/50">
          {children}
        </div>
      </main>

      <FloatingSupport />

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        requiredPlan={upgradeRequired}
        featureName={upgradeFeature}
        currentPlan={user?.plan ?? "starter"}
      />

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────
function Router() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Role-based entry redirect on first load
  useEffect(() => {
    if (user?.role === "cashier" && (location === "/" || location === "")) navigate("/pos");
    else if (user?.role === "kitchen" && (location === "/" || location === "")) navigate("/restaurant/kitchen");
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell>
      <Switch>
        <Route path="/"  component={Dashboard} />
        <Route path="/pos" component={POS} />

        <Route path="/sales"               component={SalesSummary} />
        <Route path="/sales/receipts"      component={Receipts} />
        <Route path="/sales/shifts"        component={Shifts} />
        <Route path="/sales/cash-register" component={CashRegisterReport} />

        <Route path="/inventory"                component={InventoryOverview} />
        <Route path="/inventory/products"       component={Products} />
        <Route path="/inventory/categories"     component={Categories} />
        <Route path="/inventory/suppliers"      component={Suppliers} />
        <Route path="/inventory/purchase-orders"component={PurchaseOrders} />
        <Route path="/inventory/modifiers"      component={Modifiers} />
        <Route path="/inventory/discounts"      component={Discounts} />
        <Route path="/inventory/taxes"          component={TaxesInventory} />
        <Route path="/inventory/history"        component={InventoryHistory} />
        <Route path="/inventory/transfers"      component={StockTransfers} />

        <Route path="/customers"        component={Customers} />
        <Route path="/customers/groups" component={CustomerGroups} />
        <Route path="/customers/loyalty"component={LoyaltyProgram} />
        <Route path="/customers/:id"    component={CustomerDetail} />

        <Route path="/employees"              component={Employees} />
        <Route path="/employees/time-entries" component={TimeEntries} />
        <Route path="/employees/access"       component={AccessRights} />
        <Route path="/employees/:id"          component={EmployeeDetail} />

        <Route path="/restaurant"        component={RestaurantFloor} />
        <Route path="/restaurant/kitchen"component={KitchenDisplay} />

        <Route path="/reports/by-item"     component={ReportByItem} />
        <Route path="/reports/by-category" component={ReportByCategory} />
        <Route path="/reports/by-employee" component={ReportByEmployee} />
        <Route path="/reports/by-payment"  component={ReportByPayment} />
        <Route path="/reports/by-customer" component={ReportByCustomer} />
        <Route path="/reports/cash-drawer" component={CashDrawerReport} />

        <Route path="/accounting"           component={AccountingOverview} />
        <Route path="/accounting/income"    component={IncomeTracking} />
        <Route path="/accounting/expenses"  component={Expenses} />
        <Route path="/accounting/cash-flow" component={CashFlow} />

        <Route path="/stores" component={Stores} />

        <Route path="/settings/general"       component={GeneralSettings} />
        <Route path="/settings/store"         component={StoreDetails} />
        <Route path="/settings/receipts"      component={ReceiptSettings} />
        <Route path="/settings/taxes"         component={TaxSettings} />
        <Route path="/settings/payment-types" component={PaymentTypes} />
        <Route path="/settings/cash-register" component={CashRegisterSettings} />
        <Route path="/settings/kitchen"       component={KitchenSettings} />

        <Route path="/integrations" component={Integrations} />
        <Route path="/billing"      component={Billing} />
        <Route path="/help"         component={HelpCenter} />

        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────
function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user)     return <LoginScreen />;
  // Kitchen staff get a minimal shell — full nav hidden
  if (user.role === "kitchen") return <Router />;
  return <Router />;
}

// ─── Root App ─────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CurrencyProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AuthGate />
              </WouterRouter>
              <Toaster />
            </CurrencyProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
