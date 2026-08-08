import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

// Fail closed — no fallback secret
const JWT_SECRET = process.env["SESSION_SECRET"];
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required and must be set before starting the server.");
}

export const COOKIE_NAME = "gotecx_session";

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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Requires a valid session cookie. Attaches parsed payload to req.user.
 * Returns 401 if missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Session expired" });
    return;
  }
  req.user = payload;
  next();
}

/**
 * Server-side role authorization gate.
 *
 * Store owners (userType === "owner") always pass — they have full access to their own store.
 * Employees must have one of the listed roles to proceed.
 *
 * Usage:
 *   router.post("/employees", requireRole("manager"), handler)
 *   router.delete("/products/:id", requireRole("manager"), handler)
 */
/**
 * Sign a short-lived token that binds an upload objectPath to a specific owner.
 * Used to atomically reserve upload ownership server-side in a way that works
 * across multiple instances (verifiable via shared SESSION_SECRET, not process-local state).
 */
export function signReservationToken(objectPath: string, ownerId: string): string {
  return jwt.sign({ objectPath, ownerId }, JWT_SECRET!, { expiresIn: "1h" });
}

export function verifyReservationToken(
  token: string,
): { objectPath: string; ownerId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as { objectPath: string; ownerId: string };
  } catch {
    return null;
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.userType === "owner") { next(); return; }
    if (req.user?.role && allowedRoles.includes(req.user.role)) { next(); return; }
    res.status(403).json({ error: "Insufficient permissions for this action." });
  };
}
