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
      .then(() => undefined);
  }
  return tablesReady;
}

export function computeFinancials(params: {
  totalRevenue: number;
  landCost: number;
  projectCosts: number;
  officeExpensesTotal: number;
  capitalBefore: number;
}) {
  const { totalRevenue, landCost, projectCosts, officeExpensesTotal, capitalBefore } = params;
  const grossProfit = totalRevenue - (landCost + projectCosts);
  const officeAllocation = 0.25 * officeExpensesTotal;
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

  const f = computeFinancials({
    totalRevenue,
    landCost,
    projectCosts,
    officeExpensesTotal,
    capitalBefore,
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