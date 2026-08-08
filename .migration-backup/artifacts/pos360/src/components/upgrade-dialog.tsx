import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Rocket, Crown } from "lucide-react";
import { Link } from "wouter";
import type { Plan } from "@/context/auth";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requiredPlan: "pro" | "enterprise";
  featureName?: string;
  currentPlan: Plan;
}

const PLAN_DETAILS = {
  pro: {
    icon: Zap,
    name: "Professional",
    price: "$19",
    period: "/month",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    features: [
      "Unlimited POS transactions",
      "Camera + USB barcode scanning",
      "Restaurant floor plan & kitchen display",
      "Full accounting module (P&L, Cash Flow)",
      "CRM with loyalty programs",
      "Advanced multi-staff management",
      "Advanced analytics & all reports",
      "WhatsApp & priority support",
      "Up to 5 stores / branches",
    ],
  },
  enterprise: {
    icon: Crown,
    name: "Enterprise",
    price: "$49",
    period: "/month",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-500",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    features: [
      "Everything in Professional",
      "Unlimited stores & branches",
      "Unlimited staff accounts",
      "Multi-warehouse management",
      "Custom third-party integrations",
      "Dedicated account manager",
      "SLA guarantee (99.9% uptime)",
      "Custom branding & white-label",
      "Priority phone & on-site support",
    ],
  },
};

export function UpgradeDialog({ open, onOpenChange, requiredPlan, featureName, currentPlan }: UpgradeDialogProps) {
  const plan = PLAN_DETAILS[requiredPlan];
  const PlanIcon = plan.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${plan.bg} ${plan.border} border flex items-center justify-center`}>
              <PlanIcon className={`h-4 w-4 ${plan.color}`} />
            </div>
            Upgrade to {plan.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {featureName && (
            <div className={`rounded-lg border ${plan.border} ${plan.bg} px-4 py-3`}>
              <p className="text-sm font-medium">
                <span className={`font-bold ${plan.color}`}>"{featureName}"</span> requires the{" "}
                <Badge className={`text-[10px] px-1.5 ${plan.badge}`}>{plan.name.toUpperCase()}</Badge>{" "}
                plan.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade to unlock this and all premium features instantly.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${plan.color}`}>{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Billed in USD · Cancel anytime · 14-day free trial included
            </p>
          </div>

          <ul className="space-y-2">
            {plan.features.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${plan.color}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-1">
            <Link href="/billing" className="flex-1">
              <Button className="w-full gap-2" onClick={() => onOpenChange(false)}>
                <Rocket className="h-4 w-4" />
                Upgrade to {plan.name}
              </Button>
            </Link>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Current plan: <span className="font-semibold capitalize">{currentPlan}</span> · No long-term contracts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
