import { execute, queryRows } from "./db";

export type ProjectSequence = {
  id: number;
  name: string;
  initialCapital: number;
  currentCapital: number;
  totalProjects: number;
  completedProjects: number;
  createdBy: number;
  createdAt: string;
};

export type LandProject = {
  id: number;
  sequenceId: number;
  name: string;
  description: string | null;
  landCost: number;
  capitalBefore: number;
  projectNumber: number;
  status: "active" | "completed" | "cancelled";
  startsAt: string;
  endsAt: string;
  createdBy: number;
  createdAt: string;
  // Frozen snapshot populated on completion. Null while active.
  snapshotTotalRevenue?: number | null;
  snapshotProjectCosts?: number | null;
  snapshotOfficeExpenses?: number | null;
  snapshotGrossProfit?: number | null;
  snapshotOfficeAllocation?: number | null;
  snapshotNetProfit?: number | null;
  snapshotTithe?: number | null;
  snapshotDebtPayment?: number | null;
  snapshotRetainedEarnings?: number | null;
  snapshotRunningCapitalAfter?: number | null;
  completedAt?: string | null;
};

export type ProjectRevenue = {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  revenueDate: string;
  createdAt: string;
};

export type ProjectCost = {
  id: number;
  projectId: number;
  category: string;
  description: string;
  amount: number;
  costDate: string;
  createdAt: string;
};

export type ProjectOfficeExpense = {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
};

export type OfficeExpenseRecurrence = "monthly" | "yearly";

export type OfficeExpenseItem = {
  id: number;
  name: string;
  recurrence: OfficeExpenseRecurrence;
  defaultAmount: number;
  sortOrder: number;
  createdAt: string;
};

export type OfficeExpenseBudget = {
  id: number;
  itemId: number;
  periodYear: number;
  periodMonth: number | null;
  limitAmount: number;
  createdBy: number;
  createdAt: string;
};

export type OfficeExpense = {
  id: number;
  sequenceId: number;
  itemId: number;
  itemName: string;
  recurrence: OfficeExpenseRecurrence;
  amount: number;
  expenseDate: string;
  note: string | null;
  createdBy: number;
  createdAt: string;
};

export type OfficeBudgetStatus = {
  itemId: number;
  itemName: string;
  recurrence: OfficeExpenseRecurrence;
  periodYear: number;
  periodMonth: number | null;
  limit: number;
  spent: number;
  retained: number;
  hasBudget: boolean;
};

export type ProjectFinancialReport = {
  projectId: number;
  projectName: string;
  projectNumber: number;
  totalRevenue: number;
  landCost: number;
  projectCosts: number;
  grossProfit: number;
  officeExpenses: number;
  officeAllocation: number;
  netProfit: number;
  tithe: number;
  debtPayment: number;
  retainedEarnings: number;
  runningCapitalBefore: number;
  runningCapitalAfter: number;
};

let tablesReady: Promise<void> | null = null;

export function ensureProjectTables() {
  if (!tablesReady) {
    tablesReady = execute(`
      CREATE TABLE IF NOT EXISTS land_project_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        initial_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
        current_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_projects INT NOT NULL DEFAULT 4,
        completed_projects INT NOT NULL DEFAULT 0,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`)
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS land_projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sequence_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          land_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
          capital_before DECIMAL(15,2) NOT NULL DEFAULT 0,
          project_number INT NOT NULL DEFAULT 1,
          status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
          starts_at DATE NOT NULL,
          ends_at DATE NOT NULL,
          snap_total_revenue DECIMAL(15,2) NULL,
          snap_project_costs DECIMAL(15,2) NULL,
          snap_office_expenses DECIMAL(15,2) NULL,
          snap_gross_profit DECIMAL(15,2) NULL,
          snap_office_allocation DECIMAL(15,2) NULL,
          snap_net_profit DECIMAL(15,2) NULL,
          snap_tithe DECIMAL(15,2) NULL,
          snap_debt_payment DECIMAL(15,2) NULL,
          snap_retained_earnings DECIMAL(15,2) NULL,
          snap_capital_after DECIMAL(15,2) NULL,
          completed_at TIMESTAMP NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_lp_seq (sequence_id),
          FOREIGN KEY (sequence_id) REFERENCES land_project_sequences(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => execute(`
        ALTER TABLE land_projects
          ADD COLUMN IF NOT EXISTS snap_total_revenue DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_project_costs DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_office_expenses DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_gross_profit DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_office_allocation DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_net_profit DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_tithe DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_debt_payment DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_retained_earnings DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS snap_capital_after DECIMAL(15,2) NULL,
          ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL
      `).catch(() => undefined))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS land_project_revenues (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          revenue_date DATE NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_lpr (project_id),
          FOREIGN KEY (project_id) REFERENCES land_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS land_project_costs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'General',
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          cost_date DATE NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_lpc (project_id),
          FOREIGN KEY (project_id) REFERENCES land_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS land_project_office_expenses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          expense_date DATE NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_lpoe (project_id),
          FOREIGN KEY (project_id) REFERENCES land_projects(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS office_expense_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL UNIQUE,
          recurrence ENUM('monthly','yearly') NOT NULL,
          default_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS office_expense_budgets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          item_id INT NOT NULL,
          period_year INT NOT NULL,
          period_month TINYINT NULL,
          limit_amount DECIMAL(15,2) NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_budget_period (item_id, period_year, period_month),
          KEY idx_budget_item (item_id),
          FOREIGN KEY (item_id) REFERENCES office_expense_items(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => execute(`
        CREATE TABLE IF NOT EXISTS office_expenses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sequence_id INT NOT NULL,
          item_id INT NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          expense_date DATE NOT NULL,
          note VARCHAR(255) NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_oe_seq_date (sequence_id, expense_date),
          KEY idx_oe_item_date (item_id, expense_date),
          FOREIGN KEY (sequence_id) REFERENCES land_project_sequences(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES office_expense_items(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`))
      .then(() => seedOfficeExpensesFromXlsx())
      .then(() => undefined);
  }
  return tablesReady;
}

const XLSX_SEED_ITEMS: { name: string; recurrence: OfficeExpenseRecurrence; amount: number }[] = [
  { name: "Drinking water", recurrence: "monthly", amount: 60000 },
  { name: "Electricity", recurrence: "monthly", amount: 150000 },
  { name: "Tissue", recurrence: "monthly", amount: 12000 },
  { name: "Wipes", recurrence: "monthly", amount: 10000 },
  { name: "Airfresh", recurrence: "monthly", amount: 15000 },
  { name: "Water", recurrence: "monthly", amount: 10000 },
  { name: "Furniture polish", recurrence: "monthly", amount: 22000 },
  { name: "Sugar", recurrence: "monthly", amount: 28000 },
  { name: "Office Wi-Fi", recurrence: "monthly", amount: 70000 },
  { name: "Office Wi-Fi-Air bnb ferry", recurrence: "monthly", amount: 70000 },
  { name: "Office rent", recurrence: "monthly", amount: 640000 },
  { name: "Airbnb rent (Ferry)", recurrence: "monthly", amount: 250000 },
  { name: "Cleanness & Security (Ulinzi Shirikishi)", recurrence: "monthly", amount: 20000 },
  { name: "Openai Chat GPT", recurrence: "monthly", amount: 65000 },
  { name: "Transport allowance for outreach activities", recurrence: "monthly", amount: 300000 },
  { name: "Parking", recurrence: "monthly", amount: 50000 },
  { name: "Car rental", recurrence: "monthly", amount: 900000 },
  { name: "Car wash", recurrence: "monthly", amount: 36000 },
  { name: "Fuel consumption", recurrence: "monthly", amount: 400000 },
  { name: "Salary (1)", recurrence: "monthly", amount: 300000 },
  { name: "Salary (5)", recurrence: "monthly", amount: 2632500 },
  { name: "Allowance Director 2", recurrence: "monthly", amount: 230000 },
  { name: "Living allowance Director 2", recurrence: "monthly", amount: 300000 },
  { name: "Allowance (CEO)", recurrence: "monthly", amount: 230000 },
  { name: "Utility & Communication Allowance (CEO)", recurrence: "monthly", amount: 300000 },
  { name: "Living allowance (CEO)", recurrence: "monthly", amount: 1000000 },
  { name: "House security allowance (CEO)", recurrence: "monthly", amount: 200000 },
  { name: "Marketing", recurrence: "monthly", amount: 1000000 },
  { name: "Overtime allowance", recurrence: "monthly", amount: 1000000 },
  { name: "School fee", recurrence: "yearly", amount: 29008287 },
  { name: "Clothing & Footwear", recurrence: "yearly", amount: 3000000 },
  { name: "Strategies Insurance", recurrence: "yearly", amount: 5760700 },
  { name: "Training/Seminars/Workshops", recurrence: "yearly", amount: 3000000 },
  { name: "Domain, Server, Email package", recurrence: "yearly", amount: 1500000 },
  { name: "Consultancy", recurrence: "yearly", amount: 20000000 },
  { name: "Project Preparation Costs", recurrence: "yearly", amount: 12000000 },
  { name: "Miscellaneous", recurrence: "yearly", amount: 3000000 },
  { name: "Running Capital", recurrence: "yearly", amount: 4000000 },
];

const SEED_YEAR = 2026;

async function seedOfficeExpensesFromXlsx() {
  // Bootstrap user for seeded budgets (admin id 1 expected from schema.sql).
  const [admin] = await queryRows<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`,
    [],
  ).catch(() => [] as { id: number }[]);
  const seedUserId = admin?.id ?? 1;

  for (let i = 0; i < XLSX_SEED_ITEMS.length; i++) {
    const item = XLSX_SEED_ITEMS[i];
    await execute(
      `INSERT IGNORE INTO office_expense_items
        (name, recurrence, default_amount, sort_order)
       VALUES (?, ?, ?, ?)`,
      [item.name, item.recurrence, item.amount, i],
    );

    const [row] = await queryRows<{ id: number }>(
      `SELECT id FROM office_expense_items WHERE name = ? LIMIT 1`,
      [item.name],
    );
    if (!row) continue;

    if (item.recurrence === "monthly") {
      // Seed each month of SEED_YEAR with the monthly amount as the cap.
      for (let m = 1; m <= 12; m++) {
        await execute(
          `INSERT IGNORE INTO office_expense_budgets
            (item_id, period_year, period_month, limit_amount, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [row.id, SEED_YEAR, m, item.amount, seedUserId],
        );
      }
    } else {
      await execute(
        `INSERT IGNORE INTO office_expense_budgets
          (item_id, period_year, period_month, limit_amount, created_by)
         VALUES (?, ?, NULL, ?, ?)`,
        [row.id, SEED_YEAR, item.amount, seedUserId],
      );
    }
  }
}

export function computeFinancials(params: {
  totalRevenue: number;
  landCost: number;
  projectCosts: number;
  officeExpensesTotal: number;
  capitalBefore: number;
  officeShareRatio?: number;
}) {
  const { totalRevenue, landCost, projectCosts, officeExpensesTotal, capitalBefore } = params;
  const ratio = params.officeShareRatio ?? 0.25;
  const grossProfit = totalRevenue - (landCost + projectCosts);
  const officeAllocation = ratio * officeExpensesTotal;
  const netProfit = grossProfit - officeAllocation;
  // Tithe and debt payment only apply when profitable. Losses carry through as-is.
  const tithe = netProfit > 0 ? 0.1 * netProfit : 0;
  const debtPayment = netProfit > 0 ? 0.2 * (netProfit - tithe) : 0;
  const retainedEarnings = netProfit - tithe - debtPayment;
  return {
    grossProfit,
    officeAllocation,
    netProfit,
    tithe,
    debtPayment,
    retainedEarnings,
    runningCapitalAfter: capitalBefore + retainedEarnings,
  };
}

export function calculateProjectReport(
  project: LandProject,
  revenues: { amount: number }[],
  costs: { amount: number }[],
  officeExpenses: { amount: number }[],
  options: { sequenceTotalProjects?: number } = {},
): ProjectFinancialReport {
  const landCost = Number(project.landCost);
  const capitalBefore = Number(project.capitalBefore);

  // Completed projects use their frozen snapshot so later edits can't mutate history.
  if (project.status === "completed" && project.snapshotNetProfit != null) {
    return {
      projectId: project.id,
      projectName: project.name,
      projectNumber: project.projectNumber,
      totalRevenue: Number(project.snapshotTotalRevenue ?? 0),
      landCost,
      projectCosts: Number(project.snapshotProjectCosts ?? 0),
      grossProfit: Number(project.snapshotGrossProfit ?? 0),
      officeExpenses: Number(project.snapshotOfficeExpenses ?? 0),
      officeAllocation: Number(project.snapshotOfficeAllocation ?? 0),
      netProfit: Number(project.snapshotNetProfit ?? 0),
      tithe: Number(project.snapshotTithe ?? 0),
      debtPayment: Number(project.snapshotDebtPayment ?? 0),
      retainedEarnings: Number(project.snapshotRetainedEarnings ?? 0),
      runningCapitalBefore: capitalBefore,
      runningCapitalAfter: Number(project.snapshotRunningCapitalAfter ?? capitalBefore),
    };
  }

  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
  const projectCosts = costs.reduce((s, c) => s + Number(c.amount), 0);
  const officeExpensesTotal = officeExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const N = Math.max(1, options.sequenceTotalProjects ?? 4);
  const ratio = 1 / N;

  const f = computeFinancials({
    totalRevenue,
    landCost,
    projectCosts,
    officeExpensesTotal,
    capitalBefore,
    officeShareRatio: ratio,
  });

  return {
    projectId: project.id,
    projectName: project.name,
    projectNumber: project.projectNumber,
    totalRevenue,
    landCost,
    projectCosts,
    grossProfit: f.grossProfit,
    officeExpenses: officeExpensesTotal,
    officeAllocation: f.officeAllocation,
    netProfit: f.netProfit,
    tithe: f.tithe,
    debtPayment: f.debtPayment,
    retainedEarnings: f.retainedEarnings,
    runningCapitalBefore: capitalBefore,
    runningCapitalAfter: f.runningCapitalAfter,
  };
}

export async function listProjectSequences() {
  await ensureProjectTables();
  return queryRows<ProjectSequence>(
    `SELECT id, name,
      initial_capital AS initialCapital,
      current_capital AS currentCapital,
      total_projects AS totalProjects,
      completed_projects AS completedProjects,
      created_by AS createdBy,
      created_at AS createdAt
     FROM land_project_sequences
     ORDER BY created_at DESC`,
    [],
  ).catch(() => [] as ProjectSequence[]);
}

export async function listProjectsBySequence(sequenceId: number) {
  await ensureProjectTables();
  return queryRows<LandProject>(
    `SELECT id, sequence_id AS sequenceId, name, description,
      land_cost AS landCost, capital_before AS capitalBefore,
      project_number AS projectNumber, status,
      starts_at AS startsAt, ends_at AS endsAt,
      snap_total_revenue AS snapshotTotalRevenue,
      snap_project_costs AS snapshotProjectCosts,
      snap_office_expenses AS snapshotOfficeExpenses,
      snap_gross_profit AS snapshotGrossProfit,
      snap_office_allocation AS snapshotOfficeAllocation,
      snap_net_profit AS snapshotNetProfit,
      snap_tithe AS snapshotTithe,
      snap_debt_payment AS snapshotDebtPayment,
      snap_retained_earnings AS snapshotRetainedEarnings,
      snap_capital_after AS snapshotRunningCapitalAfter,
      completed_at AS completedAt,
      created_by AS createdBy, created_at AS createdAt
     FROM land_projects
     WHERE sequence_id = ?
     ORDER BY project_number ASC`,
    [sequenceId],
  ).catch(() => [] as LandProject[]);
}

export async function listProjectRevenues(projectId: number) {
  await ensureProjectTables();
  return queryRows<ProjectRevenue>(
    `SELECT id, project_id AS projectId, description, amount,
      revenue_date AS revenueDate, created_at AS createdAt
     FROM land_project_revenues WHERE project_id = ?
     ORDER BY revenue_date DESC`,
    [projectId],
  ).catch(() => [] as ProjectRevenue[]);
}

export async function listProjectCosts(projectId: number) {
  await ensureProjectTables();
  return queryRows<ProjectCost>(
    `SELECT id, project_id AS projectId, category, description, amount,
      cost_date AS costDate, created_at AS createdAt
     FROM land_project_costs WHERE project_id = ?
     ORDER BY cost_date DESC`,
    [projectId],
  ).catch(() => [] as ProjectCost[]);
}

export async function listProjectOfficeExpenses(projectId: number) {
  await ensureProjectTables();
  return queryRows<ProjectOfficeExpense>(
    `SELECT id, project_id AS projectId, description, amount,
      expense_date AS expenseDate, created_at AS createdAt
     FROM land_project_office_expenses WHERE project_id = ?
     ORDER BY expense_date DESC`,
    [projectId],
  ).catch(() => [] as ProjectOfficeExpense[]);
}

// ── Office expense items / budgets / entries ──────────────────────────────────

export async function listOfficeExpenseItems(
  filter: "all" | "monthly" | "yearly" = "all",
  page = 1,
  limit = 10
): Promise<{ items: OfficeExpenseItem[]; total: number; totalPages: number }> {
  await ensureProjectTables();

  const offset = (page - 1) * limit;
  const whereClause = filter === "all" ? "" : " WHERE recurrence = ?";
  const params: (string | number)[] = filter === "all" ? [] : [filter];

  // Get total count
  const [countRow] = await queryRows<{ total: number }>(
    `SELECT COUNT(*) AS total FROM office_expense_items${whereClause}`,
    params,
  ).catch(() => [{ total: 0 }]);

  const total = countRow?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Get paginated items
  const items = await queryRows<OfficeExpenseItem>(
    `SELECT id, name, recurrence,
      default_amount AS defaultAmount,
      sort_order AS sortOrder,
      created_at AS createdAt
     FROM office_expense_items${whereClause}
     ORDER BY sort_order ASC, name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  ).catch(() => [] as OfficeExpenseItem[]);

  return { items, total, totalPages };
}

export async function listOfficeBudgets(year: number) {
  await ensureProjectTables();
  return queryRows<OfficeExpenseBudget>(
    `SELECT id, item_id AS itemId,
      period_year AS periodYear,
      period_month AS periodMonth,
      limit_amount AS limitAmount,
      created_by AS createdBy,
      created_at AS createdAt
     FROM office_expense_budgets
     WHERE period_year = ?
     ORDER BY item_id ASC, period_month ASC`,
    [year],
  ).catch(() => [] as OfficeExpenseBudget[]);
}

export async function listOfficeExpensesBySequence(sequenceId: number) {
  await ensureProjectTables();
  return queryRows<OfficeExpense>(
    `SELECT oe.id, oe.sequence_id AS sequenceId,
      oe.item_id AS itemId,
      i.name AS itemName,
      i.recurrence AS recurrence,
      oe.amount, oe.expense_date AS expenseDate,
      oe.note, oe.created_by AS createdBy,
      oe.created_at AS createdAt
     FROM office_expenses oe
     JOIN office_expense_items i ON i.id = oe.item_id
     WHERE oe.sequence_id = ?
     ORDER BY oe.expense_date DESC, oe.id DESC`,
    [sequenceId],
  ).catch(() => [] as OfficeExpense[]);
}

export async function sumOfficeExpensesForItemPeriod(
  itemId: number,
  year: number,
  month: number | null,
) {
  await ensureProjectTables();
  const where = month
    ? `item_id = ? AND YEAR(expense_date) = ? AND MONTH(expense_date) = ?`
    : `item_id = ? AND YEAR(expense_date) = ?`;
  const params: (number | string)[] = month ? [itemId, year, month] : [itemId, year];
  const rows = await queryRows<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM office_expenses WHERE ${where}`,
    params,
  ).catch(() => [{ total: 0 }] as { total: number | null }[]);
  return Number(rows[0]?.total ?? 0);
}

// Sum from petty_cash_transactions matching description (which maps to item name) & period (excludes rejected).
async function sumPettyCashForCategoryPeriod(
  itemName: string,
  year: number,
  month: number | null,
  excludeId?: number,
) {
  const where = month
    ? `description = ? AND status != 'rejected' AND YEAR(date) = ? AND MONTH(date) = ?`
    : `description = ? AND status != 'rejected' AND YEAR(date) = ?`;
  const params: (string | number)[] = month
    ? [itemName, year, month]
    : [itemName, year];
  let sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM petty_cash_transactions WHERE ${where}`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  const rows = await queryRows<{ total: number | null }>(sql, params).catch(
    () => [{ total: 0 }] as { total: number | null }[],
  );
  return Number(rows[0]?.total ?? 0);
}

// Sum from payment_vouchers matching description (which maps to item name) & period (excludes rejected).
async function sumVouchersForCategoryPeriod(
  itemName: string,
  year: number,
  month: number | null,
  excludeId?: number,
) {
  const where = month
    ? `description = ? AND status != 'rejected' AND YEAR(date) = ? AND MONTH(date) = ?`
    : `description = ? AND status != 'rejected' AND YEAR(date) = ?`;
  const params: (string | number)[] = month
    ? [itemName, year, month]
    : [itemName, year];
  let sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM payment_vouchers WHERE ${where}`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  const rows = await queryRows<{ total: number | null }>(sql, params).catch(
    () => [{ total: 0 }] as { total: number | null }[],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function sumTotalSpentForItem(
  itemId: number,
  itemName: string,
  year: number,
  month: number | null,
  exclude?: { pettyCashId?: number; voucherId?: number },
) {
  const [office, petty, voucher] = await Promise.all([
    sumOfficeExpensesForItemPeriod(itemId, year, month),
    sumPettyCashForCategoryPeriod(itemName, year, month, exclude?.pettyCashId),
    sumVouchersForCategoryPeriod(itemName, year, month, exclude?.voucherId),
  ]);
  return office + petty + voucher;
}

export async function findOfficeItemByCategoryName(name: string) {
  if (!name) return null;
  await ensureProjectTables();
  const rows = await queryRows<OfficeExpenseItem>(
    `SELECT id, name, recurrence,
      default_amount AS defaultAmount,
      sort_order AS sortOrder,
      created_at AS createdAt
     FROM office_expense_items
     WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name],
  ).catch(() => [] as OfficeExpenseItem[]);
  return rows[0] ?? null;
}

export type BudgetEnforcementResult =
  | { ok: true; matched: false }
  | {
      ok: true;
      matched: true;
      itemName: string;
      periodLabel: string;
      limit: number;
      spentBefore: number;
      retainedAfter: number;
    }
  | {
      ok: false;
      matched: true;
      itemName: string;
      periodLabel: string;
      limit: number;
      spentBefore: number;
      remaining: number;
      reason: string;
    };

// Validate a new charge (petty cash, voucher, etc.) against an item's budget.
// Returns matched=false if the category does not match an office item (no enforcement).
// Returns ok=false if the charge would exceed the budgeted cap for the period.
export async function enforceBudgetForCategory(params: {
  categoryName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  exclude?: { pettyCashId?: number; voucherId?: number };
}): Promise<BudgetEnforcementResult> {
  const item = await findOfficeItemByCategoryName(params.categoryName);
  if (!item) return { ok: true, matched: false };

  const period = periodFromExpenseDate(params.date, item.recurrence);
  const periodLabel = formatPeriodLabel(period.year, period.month);

  const [budget] = await queryRows<{ limit_amount: number }>(
    item.recurrence === "monthly"
      ? `SELECT limit_amount FROM office_expense_budgets
         WHERE item_id = ? AND period_year = ? AND period_month = ? LIMIT 1`
      : `SELECT limit_amount FROM office_expense_budgets
         WHERE item_id = ? AND period_year = ? AND period_month IS NULL LIMIT 1`,
    item.recurrence === "monthly"
      ? [item.id, period.year, period.month as number]
      : [item.id, period.year],
  ).catch(() => [] as { limit_amount: number }[]);

  // No budget configured → don't block (admin hasn't set a cap for this period).
  if (!budget) {
    return { ok: true, matched: true, itemName: item.name, periodLabel, limit: 0, spentBefore: 0, retainedAfter: 0 };
  }

  const limit = Number(budget.limit_amount);
  const spentBefore = await sumTotalSpentForItem(
    item.id,
    item.name,
    period.year,
    period.month,
    params.exclude,
  );
  const remaining = limit - spentBefore;

  if (params.amount > remaining) {
    return {
      ok: false,
      matched: true,
      itemName: item.name,
      periodLabel,
      limit,
      spentBefore,
      remaining: Math.max(0, remaining),
      reason: `Budget exceeded: ${item.name} ${periodLabel} cap is TZS ${Math.round(limit).toLocaleString("en-TZ")}, TZS ${Math.round(spentBefore).toLocaleString("en-TZ")} already recorded, can accept at most TZS ${Math.round(Math.max(0, remaining)).toLocaleString("en-TZ")}.`,
    };
  }

  return {
    ok: true,
    matched: true,
    itemName: item.name,
    periodLabel,
    limit,
    spentBefore,
    retainedAfter: remaining - params.amount,
  };
}

export function computeAnnualOfficeBurden(items: OfficeExpenseItem[]) {
  let monthlySum = 0;
  let yearlySum = 0;
  for (const i of items) {
    const amt = Number(i.defaultAmount);
    if (i.recurrence === "monthly") monthlySum += amt;
    else yearlySum += amt;
  }
  const annual = monthlySum * 12 + yearlySum;
  return { monthlySum, yearlySum, annual };
}

export async function buildOfficeBudgetStatusTable(year: number): Promise<OfficeBudgetStatus[]> {
  const { items } = await listOfficeExpenseItems("all", 1, 1000);
  const budgets = await listOfficeBudgets(year);
  const result: OfficeBudgetStatus[] = [];

  for (const item of items) {
    if (item.recurrence === "monthly") {
      for (let m = 1; m <= 12; m++) {
        const b = budgets.find(
          (x) => x.itemId === item.id && x.periodMonth === m,
        );
        const limit = b ? Number(b.limitAmount) : 0;
        const spent = await sumTotalSpentForItem(item.id, item.name, year, m);
        result.push({
          itemId: item.id,
          itemName: item.name,
          recurrence: item.recurrence,
          periodYear: year,
          periodMonth: m,
          limit,
          spent,
          retained: Math.max(0, limit - spent),
          hasBudget: !!b,
        });
      }
    } else {
      const b = budgets.find((x) => x.itemId === item.id && x.periodMonth == null);
      const limit = b ? Number(b.limitAmount) : 0;
      const spent = await sumTotalSpentForItem(item.id, item.name, year, null);
      result.push({
        itemId: item.id,
        itemName: item.name,
        recurrence: item.recurrence,
        periodYear: year,
        periodMonth: null,
        limit,
        spent,
        retained: Math.max(0, limit - spent),
        hasBudget: !!b,
      });
    }
  }
  return result;
}

export function periodFromExpenseDate(
  expenseDate: string,
  recurrence: OfficeExpenseRecurrence,
) {
  const [yStr, mStr] = expenseDate.slice(0, 10).split("-");
  const year = Number(yStr);
  const month = recurrence === "monthly" ? Number(mStr) : null;
  return { year, month };
}

export function formatPeriodLabel(year: number, month: number | null) {
  if (month == null) return `${year}`;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "short",
  });
  return `${monthName} ${year}`;
}