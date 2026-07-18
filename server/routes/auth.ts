import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, employeesTable, storesTable } from "../../db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
const JWT_SECRET = process.env["SESSION_SECRET"] ?? "pos360-fallback-secret";
const COOKIE_NAME = "pos360_session";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

interface JWTPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  storeId: number | null;
  userType: "owner" | "employee";
  businessName: string;
}

function signToken(payload: JWTPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;
    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      businessName: businessName.trim(),
      plan: "starter",
    }).returning();

    // Create a default store for the new owner
    const [store] = await db.insert(storesTable).values({
      name: businessName.trim(),
      address: "",
      currency: "NGN",
    }).returning();

    const payload: JWTPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "owner",
      plan: user.plan,
      storeId: null,
      userType: "owner",
      businessName: user.businessName,
    };

    const token = signToken(payload);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.status(201).json({ user: payload, store });
  } catch (err) {
    logger.error({ err }, "Registration failed");
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 1. Try owner accounts
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.email, lowerEmail));
    if (owner) {
      if (!owner.isActive) {
        return res.status(403).json({ error: "This account has been deactivated." });
      }
      const valid = await bcrypt.compare(password, owner.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Incorrect email or password." });
      }
      const payload: JWTPayload = {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: "owner",
        plan: owner.plan,
        storeId: null,
        userType: "owner",
        businessName: owner.businessName,
      };
      const token = signToken(payload);
      res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
      return res.json({ user: payload });
    }

    // 2. Try employee accounts (login with email + PIN as password)
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.email, lowerEmail));
    if (employee) {
      if (!employee.isActive) {
        return res.status(403).json({ error: "Your account has been deactivated. Contact your manager." });
      }
      // Employees use their PIN as password
      if (employee.pin !== password) {
        return res.status(401).json({ error: "Incorrect email or PIN." });
      }

      // Get business name from the owner's store
      let businessName = "My Business";
      if (employee.storeId) {
        const [store] = await db.select().from(storesTable).where(eq(storesTable.id, employee.storeId));
        if (store) businessName = store.name;
      }

      const payload: JWTPayload = {
        id: employee.id,
        name: employee.name,
        email: employee.email ?? lowerEmail,
        role: employee.role,
        plan: "professional", // employees inherit store plan
        storeId: employee.storeId ?? null,
        userType: "employee",
        businessName,
      };
      const token = signToken(payload);
      res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
      return res.json({ user: payload });
    }

    return res.status(401).json({ error: "No account found with this email." });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/auth/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session expired" });
  res.json(payload);
});

// POST /api/auth/logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

export default router;
