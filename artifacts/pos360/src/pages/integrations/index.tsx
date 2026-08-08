import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Zap, CheckCircle2 } from "lucide-react";

const integrations = [
  { id: 1, name: "WooCommerce", description: "Sync inventory and orders with your WooCommerce online store", category: "E-Commerce", connected: false, logo: "🛒" },
  { id: 2, name: "QuickBooks", description: "Automatically sync sales data to QuickBooks accounting software", category: "Accounting", connected: false, logo: "📊" },
  { id: 3, name: "Mailchimp", description: "Sync customer data to send targeted email campaigns", category: "Marketing", connected: false, logo: "📧" },
  { id: 4, name: "Xero", description: "Export sales, invoices, and tax reports to Xero", category: "Accounting", connected: false, logo: "🧾" },
  { id: 5, name: "Paystack", description: "Accept card and mobile money payments via Paystack gateway", category: "Payments", connected: true, logo: "💳" },
  { id: 6, name: "Flutterwave", description: "Accept multiple payment types via Flutterwave", category: "Payments", connected: false, logo: "🦋" },
  { id: 7, name: "Google Sheets", description: "Export sales and inventory reports to Google Sheets", category: "Reporting", connected: false, logo: "📝" },
  { id: 8, name: "Slack", description: "Receive daily sales summaries and low stock alerts on Slack", category: "Notifications", connected: false, logo: "💬" },
  { id: 9, name: "Shopify", description: "Sync products and orders between Gotecx POS and Shopify", category: "E-Commerce", connected: false, logo: "🏪" },
  { id: 10, name: "DHL", description: "Generate shipping labels and track deliveries with DHL", category: "Shipping", connected: false, logo: "📦" },
  { id: 11, name: "M-Pesa", description: "Accept M-Pesa mobile money payments", category: "Payments", connected: false, logo: "📱" },
  { id: 12, name: "Sage", description: "Sync accounting data with Sage Business Cloud", category: "Accounting", connected: false, logo: "🔢" },
];

const categories = [...new Set(integrations.map(i => i.category))];

export default function Integrations() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect Gotecx POS with your favorite tools and platforms</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="cursor-pointer">All</Badge>
        {categories.map(cat => <Badge key={cat} variant="outline" className="cursor-pointer">{cat}</Badge>)}
      </div>

      {categories.map(category => {
        const items = integrations.filter(i => i.category === category);
        return (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {category}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(integration => (
                <Card key={integration.id} className="relative">
                  {integration.connected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{integration.logo}</span>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant={integration.connected ? "default" : "outline"} className="text-xs mt-1">
                          {integration.connected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                    <Button variant={integration.connected ? "outline" : "default"} size="sm" className="w-full">
                      {integration.connected ? "Manage" : "Connect"}
                      <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
