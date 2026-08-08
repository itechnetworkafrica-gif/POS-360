import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, employeesTable, storesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

// Fail closed — server must not start without a real secret
const JWT_SECRET = process.env["SESSION_SECRET"];
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required and must be set before starting the server.");
}

const COOKIE_NAME = "gotecx_session";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export interface JWTPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  storeId: number | null;
  userType: "owner" | "employee";
  businessName: string;
}

const router = Router();

function signToken(payload: JWTPayload) {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body as {
      name?: string; email?: string; password?: string; businessName?: string;
    };
    if (!name || !email || !password || !businessName) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      businessName: businessName.trim(),
      plan: "starter",
    }).returning();

    // Create a default store and associate it with the owner
    const [store] = await db.insert(storesTable).values({
      ownerId: user.id,
      name: businessName.trim(),
      address: "",
      currency: "NGN",
      timezone: "Africa/Lagos",
    }).returning();

    const payload: JWTPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "owner",
      plan: user.plan,
      storeId: store.id,
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
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();

    // 1. Try owner accounts (password-based)
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.email, lowerEmail));
    if (owner) {
      if (!owner.isActive) {
        res.status(403).json({ error: "This account has been deactivated." });
        return;
      }
      const valid = await bcrypt.compare(password, owner.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Incorrect email or password." });
        return;
      }

      // Look up owner's primary store for JWT scope
      const [store] = await db.select({ id: storesTable.id })
        .from(storesTable).where(eq(storesTable.ownerId, owner.id));

      const payload: JWTPayload = {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: "owner",
        plan: owner.plan,
        storeId: store?.id ?? null,
        userType: "owner",
        businessName: owner.businessName,
      };
      const token = signToken(payload);
      res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
      res.json({ user: payload });
      return;
    }

    // 2. Try employee accounts (PIN-based)
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.email, lowerEmail));
    if (employee) {
      if (!employee.isActive) {
        res.status(403).json({ error: "Your account has been deactivated. Contact your manager." });
        return;
      }
      // Employees authenticate with their PIN (stored as bcrypt hash)
      const pinValid = employee.pin
        ? await bcrypt.compare(password, employee.pin)
        : false;
      if (!pinValid) {
        res.status(401).json({ error: "Incorrect email or PIN." });
        return;
      }

      let businessName = "My Business";
      if (employee.storeId) {
        const [store] = await db.select({ name: storesTable.name }).from(storesTable).where(eq(storesTable.id, employee.storeId));
        if (store) businessName = store.name;
      }

      const payload: JWTPayload = {
        id: employee.id,
        name: employee.name,
        email: employee.email ?? lowerEmail,
        role: employee.role,
        plan: "professional",
        storeId: employee.storeId ?? null,
        userType: "employee",
        businessName,
      };
      const token = signToken(payload);
      res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
      res.json({ user: payload });
      return;
    }

    res.status(401).json({ error: "No account found with this email." });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/auth/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Session expired" }); return; }
  res.json(payload);
});

// POST /api/auth/logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

export { verifyToken, COOKIE_NAME };
export default router;
