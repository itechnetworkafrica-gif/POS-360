import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import {
  Eye, EyeOff, Loader2, ShoppingCart, BarChart3, Users, Store,
  Shield, Zap, ArrowRight, Building2, CheckCircle2
} from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, text: "Full POS with barcode & Bluetooth printing" },
  { icon: BarChart3,    text: "Real-time analytics & financial reports" },
  { icon: Users,        text: "CRM, loyalty programs & customer management" },
  { icon: Store,        text: "Multi-store & multi-branch management" },
  { icon: Shield,       text: "Role-based access for your entire team" },
  { icon: Zap,          text: "Accounting, expenses & cash flow tracking" },
];

export function LoginScreen() {
  const { login, register } = useAuth();
  const [tab, setTab]     = useState<"login" | "register">("login");

  // Login form
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading]   = useState(false);
  const [loginError, setLoginError]       = useState("");

  // Register form
  const [regBusiness, setRegBusiness]     = useState("");
  const [regName, setRegName]             = useState("");
  const [regEmail, setRegEmail]           = useState("");
  const [regPassword, setRegPassword]     = useState("");
  const [regConfirm, setRegConfirm]       = useState("");
  const [showRegPass, setShowRegPass]     = useState(false);
  const [regLoading, setRegLoading]       = useState(false);
  const [regError, setRegError]           = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) { setLoginError("Email and password are required."); return; }
    setLoginError(""); setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setLoginError(err.message ?? "Login failed. Please try again.");
    } finally { setLoginLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regBusiness.trim() || !regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError("All fields are required."); return;
    }
    if (regPassword.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return; }
    setRegError(""); setRegLoading(true);
    try {
      await register({ name: regName.trim(), email: regEmail.trim(), password: regPassword, businessName: regBusiness.trim() });
    } catch (err: any) {
      setRegError(err.message ?? "Registration failed. Please try again.");
    } finally { setRegLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex bg-[#0a0e17]">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#5AC85A 1px,transparent 1px),linear-gradient(90deg,#5AC85A 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle,#5AC85A 0%,transparent 65%)" }} />

        <div className="relative z-10 space-y-10 max-w-[380px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-xl select-none" style={{ background: "rgba(90,200,90,0.12)", border: "1px solid rgba(90,200,90,0.3)", color: "#5AC85A" }}>
              G
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Gotecx <span style={{ color: "#5AC85A" }}>POS</span></h1>
              <p className="text-[11px] text-white/30 tracking-widest uppercase">by Gotecx</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight">
              Run your entire business from one screen
            </h2>
            <p className="text-white/45 text-sm leading-relaxed">
              The complete POS platform built for Nigerian and African retailers — sales, inventory, staff, and accounting all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(90,200,90,0.12)" }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: "#5AC85A" }} />
                </div>
                <span className="text-sm text-white/55">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/8">
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background overflow-y-auto p-6">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="font-black text-base select-none" style={{ color: "#5AC85A" }}>GP</span>
            <span className="font-black text-xl">POS<span className="text-[#5AC85A]">360</span></span>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border bg-muted/30 p-1 gap-1">
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(""); setRegError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to your Gotecx POS account</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input type="email" placeholder="you@company.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} disabled={loginLoading} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Input type={showLoginPass ? "text" : "password"} placeholder="••••••••" value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)} disabled={loginLoading} autoComplete="current-password" className="pr-10" />
                    <button type="button" onClick={() => setShowLoginPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loginLoading}>
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loginLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee Login</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Employees sign in with their work <span className="font-medium text-foreground">email</span> and <span className="font-medium text-foreground">PIN</span> assigned by the store owner. Contact your manager if you need access.
                </p>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button type="button" onClick={() => setTab("register")} className="text-primary font-semibold hover:underline">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold">Create your account</h2>
                <p className="text-sm text-muted-foreground">Start your 14-day free trial, no card required</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />Business / Store Name</Label>
                  <Input placeholder="e.g. Chidi's Supermarket" value={regBusiness} onChange={e => setRegBusiness(e.target.value)} disabled={regLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label>Your Full Name</Label>
                  <Input placeholder="e.g. Chidi Okafor" value={regName} onChange={e => setRegName(e.target.value)} disabled={regLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="you@company.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} disabled={regLoading} autoComplete="email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input type={showRegPass ? "text" : "password"} placeholder="Min. 6 chars" value={regPassword}
                        onChange={e => setRegPassword(e.target.value)} disabled={regLoading} className="pr-9" />
                      <button type="button" onClick={() => setShowRegPass(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showRegPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Repeat password" value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)} disabled={regLoading} />
                  </div>
                </div>
              </div>

              {regError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                  {regError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={regLoading}>
                {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {regLoading ? "Creating account..." : "Create Free Account"}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By creating an account you agree to our{" "}
                <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> and{" "}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
              </p>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setTab("login")} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
