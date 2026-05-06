"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { execute, queryRows } from "@/lib/db";
import { computeFinancials, ensureProjectTables, type LandProject } from "@/lib/projects";
import { getCurrentSession } from "@/lib/session-server";

const BASE = "/projects/land";

function goWith(type: "status" | "error", message: string, extra = ""): never {
  const q = `${type}=${encodeURIComponent(message)}${extra ? `&${extra}` : ""}`;
  redirect(`${BASE}?${q}`);
}

async function requireDirector() {
  const session = await getCurrentSession();
  if (!session) redirect("/");
  if (session.role !== "director" && session.role !== "admin") redirect("/dashboard");
  return session;
}

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: FormDataEntryValue | null) {
  const n = Number(str(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseLocalDate(s: string) {
  // Parse YYYY-MM-DD as local date, not UTC (toISOString shifts TZ+03:00 users).
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp to last day of target month (Jan 31 + 3mo -> Apr 30, not May 1).
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
async function getProjectDateWindow(projectId: number) {
  const rows = await queryRows<{ startsAt: string; endsAt: string; status: string }>(
    `SELECT starts_at AS startsAt, ends_at AS endsAt, status
     FROM land_projects WHERE id = ? LIMIT 1`,
    [projectId],
  );
  return rows[0] ?? null;
}
function assertEntryAllowed(
  win: { startsAt: string; endsAt: string; status: string } | null,
  entryDate: string,
) {
  if (!win) goWith("error", "Project not found.");
  if (win.status !== "active") goWith("error", "Cannot add entries to a non-active project.");
  const d = entryDate.slice(0, 10);
  const s = String(win.startsAt).slice(0, 10);
  const e = String(win.endsAt).slice(0, 10);
  if (d < s || d > e) goWith("error", `Date must be within project window (${s} → ${e}).`);
}

// ── Create sequence + first project ──────────────────────────────────────────

export async function createProjectSequenceAction(formData: FormData) {
  const session = await requireDirector();
  await ensureProjectTables();

  const schema = z.object({
    sequence_name: z.string().min(1, "Sequence name is required"),
    initial_capital: z.coerce.number().min(0),
    project_name: z.string().min(1, "Project name is required"),
    land_cost: z.coerce.number().min(0),
    description: z.string().optional(),
    start_date: z.string().min(1, "Start date is required"),
  });

  const parsed = schema.safeParse({
    sequence_name: str(formData.get("sequence_name")),
    initial_capital: num(formData.get("initial_capital")),
    project_name: str(formData.get("project_name")),
    land_cost: num(formData.get("land_cost")),
    description: str(formData.get("description")) || undefined,
    start_date: str(formData.get("start_date")),
  });

  if (!parsed.success) {
    goWith("error", parsed.error.issues[0]?.message ?? "Invalid data");
  }

  const startDate = parseLocalDate(parsed.data.start_date);
  const endDate = addMonths(startDate, 3);

  const seqResult = await execute(
    `INSERT INTO land_project_sequences
     (name, initial_capital, current_capital, created_by)
     VALUES (?, ?, ?, ?)`,
    [parsed.data.sequence_name, parsed.data.initial_capital, parsed.data.initial_capital, session.userId],
  );

  const sequenceId = seqResult.insertId;

  await execute(
    `INSERT INTO land_projects
     (sequence_id, name, description, land_cost, capital_before, project_number, starts_at, ends_at, created_by)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [sequenceId, parsed.data.project_name, parsed.data.description ?? null,
     parsed.data.land_cost, parsed.data.initial_capital,
     toDateStr(startDate), toDateStr(endDate), session.userId],
  );

  revalidatePath(BASE);
  goWith("status", "Sequence and Project 1 created.", `seq=${sequenceId}`);
}

// ── Add next project to existing sequence ────────────────────────────────────

export async function addProjectToSequenceAction(formData: FormData) {
  const session = await requireDirector();
  await ensureProjectTables();

  const schema = z.object({
    sequence_id: z.coerce.number().int().positive(),
    project_name: z.string().min(1, "Project name required"),
    land_cost: z.coerce.number().min(0),
    description: z.string().optional(),
    start_date: z.string().min(1, "Start date required"),
  });

  const parsed = schema.safeParse({
    sequence_id: str(formData.get("sequence_id")),
    project_name: str(formData.get("project_name")),
    land_cost: num(formData.get("land_cost")),
    description: str(formData.get("description")) || undefined,
    start_date: str(formData.get("start_date")),
  });

  if (!parsed.success) goWith("error", parsed.error.issues[0]?.message ?? "Invalid data");

  const [seq] = await queryRows<{ currentCapital: number; totalProjects: number }>(
    `SELECT current_capital AS currentCapital, total_projects AS totalProjects
     FROM land_project_sequences WHERE id = ? LIMIT 1`,
    [parsed.data.sequence_id],
  );
  if (!seq) goWith("error", "Sequence not found.");

  const [countRow] = await queryRows<{ count: number; maxNum: number }>(
    `SELECT COUNT(*) AS count, COALESCE(MAX(project_number),0) AS maxNum
     FROM land_projects WHERE sequence_id = ?`,
    [parsed.data.sequence_id],
  );
  const cap = Number(seq.totalProjects) || 4;
  if (Number(countRow?.count ?? 0) >= cap) {
    goWith("error", `Sequence already has ${cap} projects (maximum).`);
  }

  const nextNum = (countRow?.maxNum ?? 0) + 1;
  const startDate = parseLocalDate(parsed.data.start_date);
  const endDate = addMonths(startDate, 3);

  await execute(
    `INSERT INTO land_projects
     (sequence_id, name, description, land_cost, capital_before, project_number, starts_at, ends_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [parsed.data.sequence_id, parsed.data.project_name, parsed.data.description ?? null,
     parsed.data.land_cost, Number(seq.currentCapital), nextNum,
     toDateStr(startDate), toDateStr(endDate), session.userId],
  );

  revalidatePath(BASE);
  goWith("status", `Project ${nextNum} added.`, `seq=${parsed.data.sequence_id}`);
}

// ── Add revenue ───────────────────────────────────────────────────────────────

export async function addProjectRevenueAction(formData: FormData) {
  const session = await requireDirector();
  await ensureProjectTables();

  const schema = z.object({
    project_id: z.coerce.number().int().positive(),
    description: z.string().min(1, "Description required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    revenue_date: z.string().min(1),
  });

  const parsed = schema.safeParse({
    project_id: str(formData.get("project_id")),
    description: str(formData.get("description")),
    amount: num(formData.get("amount")),
    revenue_date: str(formData.get("revenue_date")),
  });

  if (!parsed.success) goWith("error", parsed.error.issues[0]?.message ?? "Invalid data");

  const win = await getProjectDateWindow(parsed.data.project_id);
  assertEntryAllowed(win, parsed.data.revenue_date);
  const seqId = await getSeqId(parsed.data.project_id);
  await execute(
    `INSERT INTO land_project_revenues (project_id, description, amount, revenue_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [parsed.data.project_id, parsed.data.description, parsed.data.amount, parsed.data.revenue_date, session.userId],
  );

  revalidatePath(BASE);
  goWith("status", "Revenue entry added.", `seq=${seqId}&project=${parsed.data.project_id}&tab=entries`);
}

// ── Add project cost ──────────────────────────────────────────────────────────

export async function addProjectCostAction(formData: FormData) {
  const session = await requireDirector();
  await ensureProjectTables();

  const schema = z.object({
    project_id: z.coerce.number().int().positive(),
    category: z.string().min(1),
    description: z.string().min(1, "Description required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    cost_date: z.string().min(1),
  });

  const parsed = schema.safeParse({
    project_id: str(formData.get("project_id")),
    category: str(formData.get("category")) || "General",
    description: str(formData.get("description")),
    amount: num(formData.get("amount")),
    cost_date: str(formData.get("cost_date")),
  });

  if (!parsed.success) goWith("error", parsed.error.issues[0]?.message ?? "Invalid data");

  const win = await getProjectDateWindow(parsed.data.project_id);
  assertEntryAllowed(win, parsed.data.cost_date);
  const seqId = await getSeqId(parsed.data.project_id);
  await execute(
    `INSERT INTO land_project_costs (project_id, category, description, amount, cost_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [parsed.data.project_id, parsed.data.category, parsed.data.description, parsed.data.amount, parsed.data.cost_date, session.userId],
  );

  revalidatePath(BASE);
  goWith("status", "Project cost added.", `seq=${seqId}&project=${parsed.data.project_id}&tab=entries`);
}

// ── Add office expense ────────────────────────────────────────────────────────

export async function addOfficeExpenseAction(formData: FormData) {
  const session = await requireDirector();
  await ensureProjectTables();

  const schema = z.object({
    project_id: z.coerce.number().int().positive(),
    description: z.string().min(1, "Description required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    expense_date: z.string().min(1),
  });

  const parsed = schema.safeParse({
    project_id: str(formData.get("project_id")),
    description: str(formData.get("description")),
    amount: num(formData.get("amount")),
    expense_date: str(formData.get("expense_date")),
  });

  if (!parsed.success) goWith("error", parsed.error.issues[0]?.message ?? "Invalid data");

  const win = await getProjectDateWindow(parsed.data.project_id);
  assertEntryAllowed(win, parsed.data.expense_date);
  const seqId = await getSeqId(parsed.data.project_id);
  await execute(
    `INSERT INTO land_project_office_expenses (project_id, description, amount, expense_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [parsed.data.project_id, parsed.data.description, parsed.data.amount, parsed.data.expense_date, session.userId],
  );

  revalidatePath(BASE);
  goWith("status", "Office expense added.", `seq=${seqId}&project=${parsed.data.project_id}&tab=entries`);
}

// ── Complete project (calculates financials, updates capital) ─────────────────

export async function completeProjectAction(formData: FormData) {
  await requireDirector();
  await ensureProjectTables();

  const projectId = Number(str(formData.get("project_id")));
  if (!projectId) goWith("error", "Invalid project ID.");

  const [project] = await queryRows<LandProject & { sequenceId: number }>(
    `SELECT lp.id, lp.sequence_id AS sequenceId, lp.land_cost AS landCost,
      lp.capital_before AS capitalBefore, lp.project_number AS projectNumber,
      lp.name, lp.description, lp.status,
      lp.starts_at AS startsAt, lp.ends_at AS endsAt,
      lp.created_by AS createdBy, lp.created_at AS createdAt
     FROM land_projects lp WHERE lp.id = ? LIMIT 1`,
    [projectId],
  );

  if (!project) goWith("error", "Project not found.");
  if (project.status === "completed") goWith("error", "Project is already completed.");

  const [revenues, costs, oe] = await Promise.all([
    queryRows<{ amount: number }>(`SELECT amount FROM land_project_revenues WHERE project_id = ?`, [projectId]),
    queryRows<{ amount: number }>(`SELECT amount FROM land_project_costs WHERE project_id = ?`, [projectId]),
    queryRows<{ amount: number }>(`SELECT amount FROM land_project_office_expenses WHERE project_id = ?`, [projectId]),
  ]);

  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
  if (totalRevenue <= 0) {
    goWith("error", "Project has no revenue recorded. Add revenue before completing.");
  }

  const landCost = Number(project.landCost);
  const projectCosts = costs.reduce((s, c) => s + Number(c.amount), 0);
  const officeTotal = oe.reduce((s, e) => s + Number(e.amount), 0);
  const capitalBefore = Number(project.capitalBefore);

  const f = computeFinancials({
    totalRevenue,
    landCost,
    projectCosts,
    officeExpensesTotal: officeTotal,
    capitalBefore,
  });

  await execute(
    `UPDATE land_projects SET
       status = 'completed',
       completed_at = CURRENT_TIMESTAMP,
       snap_total_revenue = ?,
       snap_project_costs = ?,
       snap_office_expenses = ?,
       snap_gross_profit = ?,
       snap_office_allocation = ?,
       snap_net_profit = ?,
       snap_tithe = ?,
       snap_debt_payment = ?,
       snap_retained_earnings = ?,
       snap_capital_after = ?
     WHERE id = ?`,
    [
      totalRevenue, projectCosts, officeTotal,
      f.grossProfit, f.officeAllocation, f.netProfit,
      f.tithe, f.debtPayment, f.retainedEarnings, f.runningCapitalAfter,
      projectId,
    ],
  );
  await execute(
    `UPDATE land_project_sequences
     SET current_capital = ?, completed_projects = completed_projects + 1
     WHERE id = ?`,
    [f.runningCapitalAfter, project.sequenceId],
  );

  revalidatePath(BASE);
  const formatted = new Intl.NumberFormat("sw-TZ").format(Math.round(f.runningCapitalAfter));
  goWith("status", `Project completed. New capital: TZS ${formatted}`, `seq=${project.sequenceId}`);
}

async function getSeqId(projectId: number) {
  const rows = await queryRows<{ seqId: number }>(
    `SELECT sequence_id AS seqId FROM land_projects WHERE id = ? LIMIT 1`,
    [projectId],
  );
  return rows[0]?.seqId ?? 0;
}

const deleteEntrySchema = z.object({
  id: z.coerce.number().int().positive(),
  project_id: z.coerce.number().int().positive(),
});

async function deleteProjectEntry(table: string, formData: FormData, label: string) {
  await requireDirector();
  await ensureProjectTables();
  const parsed = deleteEntrySchema.safeParse({
    id: formData.get("id"),
    project_id: formData.get("project_id"),
  });
  if (!parsed.success) goWith("error", `Invalid ${label} id.`);

  const [proj] = await queryRows<{ status: string }>(
    `SELECT status FROM land_projects WHERE id = ? LIMIT 1`,
    [parsed.data.project_id],
  );
  if (!proj) goWith("error", "Project not found.");
  if (proj.status === "completed") goWith("error", `Cannot delete entries from a completed project.`);

  const result = await execute(
    `DELETE FROM ${table} WHERE id = ? AND project_id = ?`,
    [parsed.data.id, parsed.data.project_id],
  );
  if (result.affectedRows === 0) goWith("error", `${label} not found.`);

  const seqId = await getSeqId(parsed.data.project_id);
  revalidatePath(BASE);
  goWith("status", `${label} deleted.`, `seq=${seqId}&project=${parsed.data.project_id}&tab=entries`);
}

export async function deleteProjectRevenueAction(formData: FormData) {
  return deleteProjectEntry("land_project_revenues", formData, "Revenue entry");
}

export async function deleteProjectCostAction(formData: FormData) {
  return deleteProjectEntry("land_project_costs", formData, "Cost entry");
}

export async function deleteProjectOfficeExpenseAction(formData: FormData) {
  return deleteProjectEntry("land_project_office_expenses", formData, "Office expense");
}
