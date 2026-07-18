import { Router } from "express";
import { db, employeesTable, timeEntriesTable } from "@workspace/db";
import { eq, and, isNull, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function toEmployeeJson(e: typeof employeesTable.$inferSelect) {
  return { ...e, totalSales: parseFloat(e.totalSales) };
}

function toTimeEntryJson(t: typeof timeEntriesTable.$inferSelect) {
  return { ...t, hoursWorked: t.hoursWorked !== null ? parseFloat(t.hoursWorked) : null };
}

router.get("/employees", async (req, res) => {
  try {
    const { storeId } = req.query;
    const conditions: SQL[] = [];
    if (storeId) conditions.push(eq(employeesTable.storeId, parseInt(storeId as string)));
    const employees = conditions.length > 0
      ? await db.select().from(employeesTable).where(and(...conditions)).orderBy(employeesTable.name)
      : await db.select().from(employeesTable).orderBy(employeesTable.name);
    res.json(employees.map(toEmployeeJson));
  } catch (err) {
    logger.error({ err }, "Failed to list employees");
    res.status(500).json({ error: "Failed to list employees" });
  }
});

router.post("/employees", async (req, res) => {
  try {
    const { name, email, phone, role, pin, storeId } = req.body;
    const [employee] = await db.insert(employeesTable).values({ name, email, phone, role, pin, storeId }).returning();
    res.status(201).json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to create employee");
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.get("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to get employee");
    res.status(500).json({ error: "Failed to get employee" });
  }
});

router.patch("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, role, pin, storeId, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = pin;
    if (storeId !== undefined) updates.storeId = storeId;
    if (isActive !== undefined) updates.isActive = isActive;
    const [employee] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(toEmployeeJson(employee));
  } catch (err) {
    logger.error({ err }, "Failed to update employee");
    res.status(500).json({ error: "Failed to update employee" });
  }
});

router.delete("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete employee");
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

router.post("/employees/:id/clock-in", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [entry] = await db.insert(timeEntriesTable).values({ employeeId: id, clockIn: new Date() }).returning();
    res.json(toTimeEntryJson(entry));
  } catch (err) {
    logger.error({ err }, "Failed to clock in");
    res.status(500).json({ error: "Failed to clock in" });
  }
});

router.post("/employees/:id/clock-out", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [openEntry] = await db.select().from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.employeeId, id), isNull(timeEntriesTable.clockOut)));
    if (!openEntry) return res.status(404).json({ error: "No open clock-in found" });
    const clockOut = new Date();
    const hoursWorked = (clockOut.getTime() - openEntry.clockIn.getTime()) / (1000 * 60 * 60);
    const [entry] = await db.update(timeEntriesTable)
      .set({ clockOut, hoursWorked: String(hoursWorked.toFixed(2)) })
      .where(eq(timeEntriesTable.id, openEntry.id))
      .returning();
    res.json(toTimeEntryJson(entry));
  } catch (err) {
    logger.error({ err }, "Failed to clock out");
    res.status(500).json({ error: "Failed to clock out" });
  }
});

router.get("/employees/:id/time-entries", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const entries = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.employeeId, id)).orderBy(timeEntriesTable.clockIn);
    res.json(entries.map(toTimeEntryJson));
  } catch (err) {
    logger.error({ err }, "Failed to get time entries");
    res.status(500).json({ error: "Failed to get time entries" });
  }
});

export default router;
