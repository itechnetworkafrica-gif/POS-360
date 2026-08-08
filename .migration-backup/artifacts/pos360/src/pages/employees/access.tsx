import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roles = ["owner", "manager", "cashier", "kitchen"];
const permissions = [
  { key: "process_sales", label: "Process Sales", description: "Create and complete sales transactions" },
  { key: "apply_discounts", label: "Apply Discounts", description: "Apply manual discounts at POS" },
  { key: "void_sales", label: "Void / Refund Sales", description: "Cancel or refund completed sales" },
  { key: "view_reports", label: "View Reports", description: "Access sales and inventory reports" },
  { key: "manage_inventory", label: "Manage Inventory", description: "Add, edit, or delete products" },
  { key: "manage_customers", label: "Manage Customers", description: "Create and edit customer profiles" },
  { key: "manage_employees", label: "Manage Employees", description: "Add, edit, or deactivate employees" },
  { key: "manage_settings", label: "Manage Settings", description: "Change store settings and configuration" },
  { key: "open_cash_drawer", label: "Open Cash Drawer", description: "Manually open the cash drawer" },
  { key: "no_sale", label: "No Sale", description: "Open cash drawer without a sale" },
  { key: "view_cost", label: "View Cost Price", description: "See product cost prices" },
  { key: "manage_stores", label: "Manage Stores", description: "Add or configure multiple stores" },
];

const defaultMatrix: Record<string, Record<string, boolean>> = {
  owner: Object.fromEntries(permissions.map(p => [p.key, true])),
  manager: Object.fromEntries(permissions.map(p => [p.key, !["manage_stores", "manage_employees"].includes(p.key)])),
  cashier: Object.fromEntries(permissions.map(p => [p.key, ["process_sales", "apply_discounts", "open_cash_drawer", "manage_customers"].includes(p.key)])),
  kitchen: Object.fromEntries(permissions.map(p => [p.key, false])),
};

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cashier: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function AccessRights() {
  const [matrix, setMatrix] = useState(defaultMatrix);
  const { toast } = useToast();

  const toggle = (role: string, perm: string) => {
    if (role === "owner") return;
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [perm]: !prev[role][perm] } }));
  };

  const save = () => toast({ title: "Access rights saved successfully" });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Access Rights</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure permissions for each employee role</p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Role Permissions Matrix</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Owner permissions cannot be modified.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[200px]">Permission</th>
                  {roles.map(role => (
                    <th key={role} className="px-4 py-3 text-center min-w-[100px]">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${roleColors[role]}`}>{role}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(perm => (
                  <tr key={perm.key} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </td>
                    {roles.map(role => (
                      <td key={role} className="px-4 py-3 text-center">
                        <Switch
                          checked={matrix[role][perm.key]}
                          onCheckedChange={() => toggle(role, perm.key)}
                          disabled={role === "owner"}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
