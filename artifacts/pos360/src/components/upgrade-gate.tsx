import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Crown, Rocket, Lock } from "lucide-react";
import { Link } from "wouter";
import { useAuth, type Plan } from "@/context/auth";

const PLAN_DETAILS = {
  pro: {
    icon: Zap,
    name: "Professional",
    price: "$19",
    color: "text-emerald-600",
    bg: "from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    accent: "bg-emerald-500",
    features: [
      "Restaurant floor plan & kitchen display",
      "Full accounting module (P&L, Cash Flow)",
      "CRM with loyalty programs & customer groups",
      "Advanced analytics & all reports",
      "Employee time tracking & access control",
      "Purchase orders, stock transfers",
      "WhatsApp & priority support",
      "Up to 5 stores / branches",
    ],
  },
  enterprise: {
    icon: Crown,
    name: "Enterprise",
    price: "$49",
    color: "text-purple-600",
    bg: "from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30",
    border: "border-purple-200 dark:border-purple-800",
    accent: "bg-purple-500",
    features: [
      "Everything in Professional",
      "Unlimited stores & branches",
      "Unlimited staff accounts",
      "Multi-warehouse management",
      "Custom third-party integrations",
      "Dedicated account manager",
      "SLA guarantee (99.9% uptime)",
      "Custom branding & white-label",
    ],
  },
};

interface UpgradeGateProps {
  required: "pro" | "enterprise";
  featureName: string;
  children: React.ReactNode;
}

export function UpgradeGate({ required, featureName, children }: UpgradeGateProps) {
  const { canAccess } = useAuth();
  if (canAccess(required)) return <>{children}</>;

  const plan = PLAN_DETAILS[required];
  const PlanIcon = plan.icon;

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className={`w-full max-w-lg rounded-2xl border-2 ${plan.border} bg-gradient-to-br ${plan.bg} p-8 text-center space-y-6 shadow-sm`}>
        <div className="flex justify-center">
          <div className={`h-16 w-16 rounded-2xl ${plan.accent} flex items-center justify-center shadow-lg`}>
            <PlanIcon className="h-8 w-8 text-white" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.name} Feature</span>
          </div>
          <h2 className="text-2xl font-black">{featureName}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Upgrade to {plan.name} to unlock this feature and everything below.
          </p>
        </div>

        <ul className="text-left space-y-2">
          {plan.features.map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${plan.color}`} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <div className="text-center">
            <span className={`text-4xl font-black ${plan.color}`}>{plan.price}</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
          <Link href="/billing">
            <Button className="w-full h-11 gap-2 text-base font-bold">
              <Rocket className="h-5 w-5" />
              Upgrade to {plan.name}
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
