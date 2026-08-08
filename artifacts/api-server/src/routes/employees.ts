import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, employeesTable, timeEntriesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// storeId guaranteed non-null by tenant-scope gate
function getStoreId(req: Express.Request): number { return req.user!.storeId!; }

function toEmployeeJson(e: typeof employeesTable.$inferSelect) {
  const { pin: _pin, ...rest } = e;   // never expose the PIN hash
  return { ...rest, totalSales: parseFloat(rest.totalSales) };
}

function toTimeEntryJson(t: typeof timeEntriesTable.$inferSelect) {
  return { ...t, hoursWorked: t.hoursWorked !== null ? parseFloat(t.hoursWorked) : null };
}

router.get("/employees", async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const employees = await db.select().from(employeesTable)
      .where(eq(employeesTable.storeId, storeId))
      .orderBy(employeesTable.name);
    res.json(employees.map(toEmployeeJson));
  } catch (err) {
    logger.error({ err }, "Failed to list employees");
    res.status(500).json({ error: "Failed to list employees" });
  }
});

/**
 * Creating employees requires manager or owner.
 * The role assigned to the new employee cannot be "owner" (owners register separately).
 * Only owners can promote a new employee to "manager".
 */
router.post("/employees", requireRole("manager"), async (req, res) => {
  try {
    const storeId = getStoreId(req);
    const { name, email, phone, role, pin } = req.body as {
      name: string; email?: string; phone?: string; role?: string; pin?: string;
    };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    if (role === "owner") {
      res.status(403).json({ error: "Cannot create an employee with the owner role." }); return;
    }
    if (role === "manager" && req.user!.userType !== "owner") {
      res.status(403).json({ error: "Only store owners can assign the manager role." }); return;
    }
    const pinHash = pin ? await bcrypt.hash(pin, 10) : undefined;
    const [employee] = await db.insert(employeesTable).values({
      name, email, phone, role: role ?? "cashier", storeId,
      ...(pinHash !== undefined && { pin: pinHash }),
    }).returning();
    res.status(201).json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to create employee");
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.get("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [employee] = await db.select().from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId)));
    if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
    res.json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to get employee");
    res.status(500).json({ error: "Failed to get employee" });
  }
});

/**
 * Updating employees requires manager or owner.
 * The role cannot be escalated to "owner".
 * Only owners can promote to "manager".
 */
router.patch("/employees/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const { name, email, phone, role, pin, isActive } = req.body as {
      name?: string; email?: string; phone?: string; role?: string; pin?: string; isActive?: boolean;
    };
    if (role === "owner") {
      res.status(403).json({ error: "Cannot assign the owner role to an employee." }); return;
    }
    if (role === "manager" && req.user!.userType !== "owner") {
      res.status(403).json({ error: "Only store owners can promote an employee to manager." }); return;
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = await bcrypt.hash(pin, 10);
    if (isActive !== undefined) updates.isActive = isActive;
    const [employee] = await db.update(employeesTable).set(updates)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId))).returning();
    if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
    res.json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to update employee");
    res.status(500).json({ error: "Failed to update employee" });
  }
});

router.delete("/employees/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    await db.delete(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete employee");
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

router.post("/employees/:id/clock-in", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId)));
    if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
    const [entry] = await db.insert(timeEntriesTable).values({ employeeId: id, clockIn: new Date() }).returning();
    res.json(toTimeEntryJson(entry));
  } catch (err) {
    logger.error({ err }, "Failed to clock in");
    res.status(500).json({ error: "Failed to clock in" });
  }
});

router.post("/employees/:id/clock-out", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId)));
    if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
    const [openEntry] = await db.select().from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.employeeId, id), isNull(timeEntriesTable.clockOut)));
    if (!openEntry) { res.status(404).json({ error: "No open clock-in found" }); return; }
    const clockOut = new Date();
    const hoursWorked = (clockOut.getTime() - openEntry.clockIn.getTime()) / (1000 * 60 * 60);
    const [entry] = await db.update(timeEntriesTable)
      .set({ clockOut, hoursWorked: String(hoursWorked.toFixed(2)) })
      .where(eq(timeEntriesTable.id, openEntry.id)).returning();
    res.json(toTimeEntryJson(entry));
  } catch (err) {
    logger.error({ err }, "Failed to clock out");
    res.status(500).json({ error: "Failed to clock out" });
  }
});

router.get("/employees/:id/time-entries", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const storeId = getStoreId(req);
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.storeId, storeId)));
    if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
    const entries = await db.select().from(timeEntriesTable)
      .where(eq(timeEntriesTable.employeeId, id))
      .orderBy(timeEntriesTable.clockIn);
    res.json(entries.map(toTimeEntryJson));
  } catch (err) {
    logger.error({ err }, "Failed to get time entries");
    res.status(500).json({ error: "Failed to get time entries" });
  }
});

export default router;
