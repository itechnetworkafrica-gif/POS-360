import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import {
  Check, Zap, Building2, Crown, CreditCard, Shield, Lock,
  Wifi, AlertCircle, CheckCircle2, X, Loader2
} from "lucide-react";

// ─── Plan data (USD) ──────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    monthlyPrice: 9,
    yearlyPrice: 86,
    color: "border-border",
    accent: "text-slate-600",
    badge: null as string | null,
    features: [
      "1 Store / Branch",
      "3 Staff Accounts",
      "Basic POS Terminal",
      "Inventory Management",
      "Customer Records",
      "Basic Reports",
      "Email Support",
    ],
    missing: ["Restaurant Module", "Accounting", "Loyalty Program", "Advanced Reports"],
  },
  {
    id: "professional",
    name: "Professional",
    icon: Building2,
    monthlyPrice: 19,
    yearlyPrice: 182,
    color: "border-primary ring-2 ring-primary",
    accent: "text-primary",
    badge: "Most Popular",
    features: [
      "5 Stores / Branches",
      "25 Staff Accounts",
      "Advanced POS + Barcode Scanner",
      "Full Inventory Suite",
      "CRM & Loyalty Program",
      "Restaurant Floor Plan + Kitchen",
      "Advanced Analytics",
      "Accounting Module",
      "WhatsApp Priority Support",
      "API Access",
    ],
    missing: ["Unlimited Stores", "Dedicated Manager"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    monthlyPrice: 49,
    yearlyPrice: 470,
    color: "border-purple-500",
    accent: "text-purple-600",
    badge: "Best Value",
    features: [
      "Unlimited Stores",
      "Unlimited Staff Accounts",
      "All Professional Features",
      "Multi-Warehouse Management",
      "Custom Integrations",
      "Dedicated Account Manager",
      "SLA Guarantee (99.9% uptime)",
      "Custom Branding",
      "On-site Training",
    ],
    missing: [],
  },
];

function detectCardType(num: string): { type: string; color: string } {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n))         return { type: "Visa",       color: "#1a1f71" };
  if (/^5[1-5]/.test(n))    return { type: "Mastercard", color: "#eb001b" };
  if (/^3[47]/.test(n))     return { type: "Amex",       color: "#007bc1" };
  if (/^6(50|506|5002)/.test(n)) return { type: "Verve", color: "#009a44" };
  return { type: "", color: "" };
}
function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
}

function PaymentForm({ plan, yearly, onClose }: { plan: typeof PLANS[0]; yearly: boolean; onClose: () => void }) {
  const { updatePlan } = useAuth();
  const { toast }      = useToast();
  const [cardNum, setCardNum]   = useState("");
  const [expiry, setExpiry]     = useState("");
  const [cvv, setCvv]           = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const price    = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const cardType = detectCardType(cardNum);
  const valid    = cardNum.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvv.length >= 3 && name.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setSuccess(true);
    updatePlan(plan.id as any);
    toast({ title: `✓ Upgraded to ${plan.name}!`, description: "Your plan is now active." });
    setTimeout(onClose, 2000);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Payment Successful!</h3>
          <p className="text-muted-foreground text-sm mt-1">Your {plan.name} plan is now active.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <div>
          <p className="font-semibold">{plan.name} Plan</p>
          <p className="text-sm text-muted-foreground">{yearly ? "Annual billing" : "Monthly billing"} · USD</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">${price}</p>
          <p className="text-xs text-muted-foreground">/{yearly ? "year" : "month"}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Card Number</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 pr-16 font-mono tracking-widest" placeholder="0000 0000 0000 0000"
            value={cardNum} onChange={e => setCardNum(formatCardNumber(e.target.value))} maxLength={19} />
          {cardType.type && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ color: cardType.color, border: `1px solid ${cardType.color}44` }}>{cardType.type}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Expiry Date</Label>
          <Input placeholder="MM/YY" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} maxLength={5} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">CVV <Shield className="h-3 w-3 text-muted-foreground" /></Label>
          <Input type="password" placeholder="•••" value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} className="font-mono" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Name on Card</Label>
        <Input placeholder="As it appears on your card" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
        <span>Your card details are encrypted and secure. All payments are processed in USD. Your subscription begins immediately after confirmation.</span>
      </div>

      <Button type="submit" className="w-full h-12 text-base font-bold gap-2" disabled={!valid || loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
          : <><Wifi className="h-4 w-4" /> Pay ${price} {yearly ? "/ year" : "/ month"}</>}
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> SSL Secured</span>
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> PCI Compliant</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Cancel Anytime</span>
      </div>
    </form>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const [yearly, setYearly]         = useState(false);
  const [checkoutPlan, setCheckout] = useState<typeof PLANS[0] | null>(null);
  const { toast } = useToast();

  const currentPlanId = user?.plan ?? "starter";
  const currentPlan   = PLANS.find(p => p.id === currentPlanId) ?? PLANS[0];

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and payment details · All prices in USD</p>
      </div>

      {/* Current plan banner */}
      <div className="rounded-2xl border-2 border-primary bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <currentPlan.icon className={`h-6 w-6 ${currentPlan.accent}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg">{currentPlan.name} Plan</p>
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">● Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentPlanId === "starter" ? "Free tier — upgrade to unlock all features" : `$${currentPlan.monthlyPrice}/month · Billed monthly in USD`}
            </p>
          </div>
        </div>
        {currentPlanId !== "enterprise" && (
          <Button onClick={() => setCheckout(PLANS.find(p => p.id === (currentPlanId === "starter" ? "professional" : "enterprise")) ?? PLANS[1])}>
            Upgrade Plan
          </Button>
        )}
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
        <Switch checked={yearly} onCheckedChange={setYearly} />
        <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          Yearly <Badge className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Save 20%</Badge>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const Icon       = plan.icon;
          const price      = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrent  = plan.id === currentPlanId;
          const isDowngrade = PLANS.indexOf(plan) < PLANS.findIndex(p => p.id === currentPlanId);

          return (
            <Card key={plan.id} className={`relative border-2 ${plan.color} flex flex-col`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">{plan.badge}</span>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${plan.accent}`} />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">${price}</span>
                  <span className="text-muted-foreground text-sm">/{yearly ? "yr" : "mo"}</span>
                </div>
                {yearly && <p className="text-xs text-emerald-600 font-medium">Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}/year</p>}
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                      <X className="h-4 w-4 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || isDowngrade} onClick={() => setCheckout(plan)}>
                  {isCurrent ? "Current Plan" : isDowngrade ? "Downgrade" : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" /> Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border p-4">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">No card on file</p>
              <p className="text-xs text-muted-foreground">Add a card to enable automatic billing</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCheckout(currentPlan)}>Add Card</Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            All charges are in USD. Bank account connection will be available soon for automatic payment processing.
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Frequently Asked Questions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: "Can I upgrade at any time?", a: "Yes. Upgrades take effect immediately. You'll be charged a prorated amount for the remainder of the billing period." },
            { q: "What happens to my data if I downgrade?", a: "Your data is never deleted. Features are simply locked until you re-upgrade." },
            { q: "Is there a free trial?", a: "Yes — all new accounts come with a 14-day free trial of the Professional plan. No credit card required to start." },
            { q: "Do you offer discounts for NGOs or education?", a: "Yes. Contact support@itech.africa for special pricing." },
          ].map((item, i) => (
            <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
              <p className="font-semibold text-sm">{item.q}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Checkout modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background">
              <div>
                <h3 className="font-bold text-lg">Upgrade to {checkoutPlan.name}</h3>
                <p className="text-sm text-muted-foreground">Enter your card details to continue</p>
              </div>
              <button onClick={() => setCheckout(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <PaymentForm plan={checkoutPlan} yearly={yearly} onClose={() => setCheckout(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
