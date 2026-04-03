import type { RowDataPacket } from "mysql2/promise";

import { queryRows } from "./db";
import type { SessionUser, UserRole } from "./session";

type CountRow = RowDataPacket & {
  count: number;
};

type MoneyRow = RowDataPacket & {
  total: number | null;
};

export type DashboardOverview = {
  scopeLabel: string;
  summary: Array<{
    label: string;
    value: number;
    detail: string;
  }>;
  recentInvoices: RecentInvoice[];
  recentReceipts: RecentReceipt[];
  recentPettyCash: RecentPettyCash[];
  recentVouchers: RecentVoucher[];
  recentLetters: RecentLetter[];
};

export type RecentInvoice = RowDataPacket & {
  id: number;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  grandTotal: number;
};

export type RecentReceipt = RowDataPacket & {
  id: number;
  receiptNumber: string;
  customerName: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
};

export type RecentPettyCash = RowDataPacket & {
  id: number;
  date: string;
  pettycashNumber: string | null;
  code: string | null;
  referenceNumber: string | null;
  description: string;
  category: string;
  amount: number;
};

export type RecentVoucher = RowDataPacket & {
  id: number;
  voucherNumber: string;
  voucherDate: string;
  category: string;
  description: string;
  amount: number;
  status: string;
};

export type RecentLetter = RowDataPacket & {
  id: number;
  name: string;
  description: string;
  createdAt: string;
};

function scopeFilter(session: SessionUser) {
  return session.role === "admin"
    ? { clause: "", params: [] as Array<string | number> }
    : { clause: " WHERE user_id = ?", params: [session.userId] };
}

async function safeCount(sql: string, params: Array<string | number>) {
  try {
    const rows = await queryRows<CountRow>(sql, params);
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function safeMoney(sql: string, params: Array<string | number>) {
  try {
    const rows = await queryRows<MoneyRow>(sql, params);
    return Number(rows[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function getDashboardOverview(
  session: SessionUser,
): Promise<DashboardOverview> {
  const filter = scopeFilter(session);
  const filterClause = filter.clause;
  const filterParams = filter.params;
  const approvedVoucherClause =
    session.role === "admin"
      ? " WHERE status = 'approved'"
      : " WHERE status = 'approved' AND user_id = ?";
  const approvedVoucherParams =
    session.role === "admin" ? [] : [session.userId];
  const pettyCashClause = filterClause;
  const pettyCashParams = filterParams;

  const [
    invoicesCount,
    receiptsCount,
    vouchersCount,
    lettersCount,
    pettyCashCount,
    invoicesTotal,
    receiptsTotal,
    pettyCashTotal,
    approvedVoucherTotal,
    usersCount,
    recentInvoices,
    recentReceipts,
    recentPettyCash,
    recentVouchers,
    recentLetters,
  ] = await Promise.all([
    safeCount(
      `SELECT COUNT(*) AS count FROM invoices${filterClause}`,
      filterParams,
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM receipts${filterClause}`,
      filterParams,
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM payment_vouchers${approvedVoucherClause}`,
      approvedVoucherParams,
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM printed_letters${filterClause}`,
      filterParams,
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM petty_cash_transactions${pettyCashClause}`,
      pettyCashParams,
    ),
    safeMoney(
      `SELECT SUM(grand_total) AS total FROM invoices${filterClause}`,
      filterParams,
    ),
    safeMoney(
      `SELECT SUM(amount) AS total FROM receipts${filterClause}`,
      filterParams,
    ),
    safeMoney(
      `SELECT SUM(amount) AS total FROM petty_cash_transactions${pettyCashClause}`,
      pettyCashParams,
    ),
    safeMoney(
      `SELECT SUM(amount) AS total FROM payment_vouchers${approvedVoucherClause}`,
      approvedVoucherParams,
    ),
    session.role === "admin"
      ? safeCount("SELECT COUNT(*) AS count FROM users", [])
      : Promise.resolve(0),
    queryRows<RecentInvoice>(
      `SELECT id, invoice_number AS invoiceNumber, director AS customerName, invoice_date AS invoiceDate, grand_total AS grandTotal FROM invoices${filterClause} ORDER BY created_at DESC LIMIT 5`,
      filterParams,
    ).catch(() => []),
    queryRows<RecentReceipt>(
      `SELECT id, receipt_number AS receiptNumber, customer_name AS customerName, receipt_date AS receiptDate, amount, payment_method AS paymentMethod FROM receipts${filterClause} ORDER BY created_at DESC LIMIT 5`,
      filterParams,
    ).catch(() => []),
    queryRows<RecentPettyCash>(
      `SELECT id, date, pettycash_number AS pettycashNumber, code, reference_number AS referenceNumber, description, category, amount FROM petty_cash_transactions${pettyCashClause} ORDER BY created_at DESC LIMIT 5`,
      pettyCashParams,
    ).catch(() => []),
    queryRows<RecentVoucher>(
      `SELECT id, voucher_number AS voucherNumber, date AS voucherDate, category, description, amount, status FROM payment_vouchers${filterClause} ORDER BY created_at DESC LIMIT 5`,
      filterParams,
    ).catch(() => []),
    queryRows<RecentLetter>(
      `SELECT id, name, COALESCE(description, '') AS description, created_at AS createdAt FROM printed_letters${filterClause} ORDER BY created_at DESC LIMIT 5`,
      filterParams,
    ).catch(() => []),
  ]);

  const scopeLabel = session.role === "admin" ? "All records" : "Your records";

  return {
    scopeLabel,
    summary: [
      {
        label: "Invoices",
        value: invoicesCount,
        detail: `TZS ${invoicesTotal.toLocaleString()}`,
      },
      {
        label: "Receipts",
        value: receiptsCount,
        detail: `TZS ${receiptsTotal.toLocaleString()}`,
      },
      {
        label: "Petty Cash Voucher",
        value: pettyCashCount,
        detail: `TZS ${pettyCashTotal.toLocaleString()}`,
      },
      {
        label: "Approved Payment Vouchers",
        value: vouchersCount,
        detail: `TZS ${approvedVoucherTotal.toLocaleString()}`,
      },
      {
        label: "Printed Letters",
        value: lettersCount,
        detail: "Document archive",
      },
      ...(session.role === "admin"
        ? [
            {
              label: "Users",
              value: usersCount,
              detail: "Admin and secretary accounts",
            },
          ]
        : []),
    ],
    recentInvoices,
    recentReceipts,
    recentPettyCash,
    recentVouchers,
    recentLetters,
  };
}
