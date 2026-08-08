import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Plan = "starter" | "professional" | "enterprise";
export type Role = "owner" | "manager" | "cashier" | "kitchen";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  storeId: number | null;
  userType: "owner" | "employee";
  businessName: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  businessName: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (required: "pro" | "enterprise") => boolean;
  hasRole: (...roles: Role[]) => boolean;
  updatePlan: (plan: Plan) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PLAN_RANK: Record<Plan, number> = { starter: 0, professional: 1, enterprise: 2 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) setUser(await res.json());
      } catch {}
      finally { setIsLoading(false); }
    };
    // Brief delay so the loading animation is visible
    const t = setTimeout(check, 1400);
    return () => clearTimeout(t);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    let data: { user?: SessionUser; error?: string } | null = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    if (!res.ok) throw new Error(data?.error ?? `Login failed (${res.status})`);
    if (!data?.user) throw new Error("Login failed — unexpected server response");
    setUser(data.user);
  };

  const register = async (form: RegisterData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    let data: { user?: SessionUser; error?: string } | null = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    if (!res.ok) throw new Error(data?.error ?? `Registration failed (${res.status})`);
    if (!data?.user) throw new Error("Registration failed — unexpected server response");
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  // All features are unlocked for every plan — no gating on the app itself.
  const canAccess = (_required: "pro" | "enterprise"): boolean => {
    return !!user;
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updatePlan = (plan: Plan) => {
    if (user) setUser({ ...user, plan });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, canAccess, hasRole, updatePlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
