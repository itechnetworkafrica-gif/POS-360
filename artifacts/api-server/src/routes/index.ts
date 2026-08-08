import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../lib/auth";
import { db, employeesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import chatRouter from "./chat";
import customersRouter from "./customers";
import dashboardRouter from "./dashboard";
import employeesRouter from "./employees";
import inventoryRouter from "./inventory";
import productsRouter from "./products";
import reportsRouter from "./reports";
import restaurantRouter from "./restaurant";
import salesRouter from "./sales";
import storageRouter from "./storage";
import storesRouter from "./stores";
import suppliersRouter from "./suppliers";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// Session gate — all routes below require a valid JWT cookie
router.use(requireAuth);

/**
 * Account-state validation gate.
 *
 * Consults the database on every authenticated request to enforce:
 * - Owner/employee deactivation (isActive = false → 401 immediately)
 * - Current employee role (refreshed from DB so a manager demoted to cashier
 *   cannot retain elevated permissions until their token expires)
 *
 * This makes account revocation effective immediately rather than waiting for
 * token expiry (up to 7 days).
 */
router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.userType === "employee") {
      const [emp] = await db
        .select({ isActive: employeesTable.isActive, role: employeesTable.role })
        .from(employeesTable)
        .where(
          and(
            eq(employeesTable.id, req.user!.id),
            eq(employeesTable.storeId, req.user!.storeId!),
          ),
        );
      if (!emp || !emp.isActive) {
        res.status(401).json({ error: "Account is disabled. Contact your manager." });
        return;
      }
      // Refresh role from DB so demotion/promotion takes effect immediately.
      req.user!.role = emp.role;
    } else {
      // Owner account — check isActive from users table
      const [user] = await db
        .select({ isActive: usersTable.isActive })
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id));
      if (!user || !user.isActive) {
        res.status(401).json({ error: "Account is disabled. Contact support." });
        return;
      }
    }
    next();
  } catch (err) {
    logger.error({ err }, "Failed to validate account state");
    res.status(500).json({ error: "Failed to validate account state" });
  }
});

/**
 * Tenant scope gate — every authenticated route MUST have a non-null storeId.
 * This prevents any request without an associated store from reaching business data.
 * Owners without a store (edge case) and employees without a store assignment are blocked.
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.user!.storeId == null) {
    res.status(403).json({
      error: "No store is associated with this account. Contact your administrator.",
    });
    return;
  }
  next();
});

router.use(categoriesRouter);
router.use(chatRouter);
router.use(customersRouter);
router.use(dashboardRouter);
router.use(employeesRouter);
router.use(inventoryRouter);
router.use(productsRouter);
router.use(reportsRouter);
router.use(restaurantRouter);
router.use(salesRouter);
router.use(storageRouter);
router.use(storesRouter);
router.use(suppliersRouter);

export default router;
