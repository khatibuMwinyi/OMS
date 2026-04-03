import { execute, queryRows } from "./db";
import {
  buildReportPeriodScope,
  type ReportPeriod,
  type ReportPeriodContext,
} from "./report-period";
import type { SessionUser } from "./session";

type Scope = {
  clause: string;
  params: Array<string | number>;
};

export type InvoiceRecord = {
  id: number;
  invoiceNumber: string;
  tin: string | null;
  invoiceDate: string;
  customerName: string;
  phone: string | null;
  paymentMethod: string | null;
  bankAccount: string | null;
  holderName: string | null;
  bankName: string | null;
  mobileNumber: string | null;
  mobileHolder: string | null;
  mobileOperator: string | null;
  subtotal: number;
  vat: number;
  discount: number;
  grandTotal: number;
  userId: number;
  createdAt: string;
};

export type InvoiceItemRecord = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptRecord = {
  id: number;
  receiptNumber: string;
  customerName: string;
  code: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  phone: string | null;
  amount: number;
  paymentMethod: string;
  bankName: string | null;
  branchName: string | null;
  referenceNumber: string | null;
  receiptDate: string;
  userId: number;
  createdAt: string;
};

export type PettyCashRecord = {
  id: number;
  date: string;
  code: string | null;
  type: string | null;
  description: string;
  category: string;
  amount: number;
  pettycashNumber: string | null;
  referenceNumber: string | null;
  userId: number;
  createdAt: string;
};

export type VoucherRecord = {
  id: number;
  voucherNumber: string;
  date: string;
  customerName: string | null;
  paymentMethod: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  bankReference: string | null;
  mobileNumber: string | null;
  payerName: string | null;
  mobileReference: string | null;
  code: string | null;
  type: string | null;
  category: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  adminComment: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  userId: number;
  createdAt: string;
};

export type LetterRecord = {
  id: number;
  name: string;
  description: string | null;
  pdfPath: string;
  letterDate: string | null;
  receiverAddress: string | null;
  heading: string | null;
  body: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type IncomingLetterRecord = {
  id: number;
  senderName: string;
  senderOrganization: string | null;
  subject: string;
  category: string;
  receivedDate: string;
  pdfPath: string;
  originalFileName: string | null;
  description: string | null;
  userId: number;
  createdAt: string;
};

function scope(session: SessionUser): Scope {
  return session.role === "admin"
    ? { clause: " WHERE 1 = 1", params: [] }
    : { clause: " WHERE 1 = 1 AND user_id = ?", params: [session.userId] };
}

let incomingLettersTableReady: Promise<void> | null = null;

function ensureIncomingLettersTable() {
  if (!incomingLettersTableReady) {
    incomingLettersTableReady = execute(`
      CREATE TABLE IF NOT EXISTS incoming_letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_name VARCHAR(255) NOT NULL,
        sender_organization VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        received_date DATE NOT NULL,
        pdf_path VARCHAR(500) NOT NULL,
        original_file_name VARCHAR(255),
        description TEXT,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_incoming_letters_user_created (user_id, created_at),
        KEY idx_incoming_letters_received_date (received_date, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
      .then(() =>
        execute(`
          ALTER TABLE incoming_letters
          ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500) NOT NULL DEFAULT ''
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE incoming_letters
          ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255) NULL
        `),
      )
      .then(() => undefined);
  }

  return incomingLettersTableReady;
}

export function splitLetterBody(body: string | null | undefined) {
  const value = (body ?? "").trim();

  if (!value) {
    return {
      customMessage: "",
      signature: "",
    };
  }

  const parts = value.split(/\n\n+/);
  if (parts.length === 1) {
    return {
      customMessage: parts[0],
      signature: "",
    };
  }

  const signature = parts.pop() ?? "";

  return {
    customMessage: parts.join("\n\n"),
    signature,
  };
}

async function firstOrNull<T>(
  sql: string,
  params: Array<string | number>,
): Promise<T | null> {
  const [row] = await queryRows<T>(sql, params);
  return row ?? null;
}

function incrementSequentialNumber(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) {
    return "00001";
  }

  const numericSuffix = text.match(/^(.*?)(\d+)$/);
  if (numericSuffix) {
    const prefix = numericSuffix[1];
    const digits = numericSuffix[2];
    const nextDigits = String(Number(digits) + 1).padStart(digits.length, "0");
    return `${prefix}${nextDigits}`;
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed)) {
    return String(parsed + 1).padStart(Math.max(text.length, 5), "0");
  }

  return `${text}-01`;
}

function incrementPrefixedSequentialNumber(
  value: string | null | undefined,
  prefix: string,
) {
  const text = (value ?? "").trim();
  const numericSuffix = text.startsWith(prefix)
    ? text.slice(prefix.length)
    : "";
  const parsed = Number(numericSuffix);

  if (numericSuffix && Number.isFinite(parsed)) {
    return `${prefix}${String(parsed + 1).padStart(Math.max(numericSuffix.length, 3), "0")}`;
  }

  return `${prefix}001`;
}

async function getLatestReceiptNumber() {
  const record = await firstOrNull<{ receiptNumber: string }>(
    `SELECT receipt_number AS receiptNumber
     FROM receipts
     ORDER BY CAST(receipt_number AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.receiptNumber ?? null;
}

async function getLatestVoucherNumber() {
  const record = await firstOrNull<{ voucherNumber: string }>(
    `SELECT voucher_number AS voucherNumber
     FROM payment_vouchers
     ORDER BY CAST(voucher_number AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.voucherNumber ?? null;
}

async function getLatestInvoiceNumber() {
  const record = await firstOrNull<{ invoiceNumber: string }>(
    `SELECT invoice_number AS invoiceNumber
     FROM invoices
     WHERE invoice_number LIKE 'IN%'
     ORDER BY CAST(SUBSTRING(invoice_number, 3) AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.invoiceNumber ?? null;
}

async function getLatestPettyCashNumber() {
  const record = await firstOrNull<{ pettyCashNumber: string }>(
    `SELECT pettycash_number AS pettyCashNumber
     FROM petty_cash_transactions
     WHERE pettycash_number LIKE 'PC%'
     ORDER BY CAST(SUBSTRING(pettycash_number, 3) AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.pettyCashNumber ?? null;
}

export async function getNextReceiptNumber() {
  return incrementSequentialNumber(await getLatestReceiptNumber());
}

export async function getNextInvoiceNumber() {
  return incrementPrefixedSequentialNumber(
    await getLatestInvoiceNumber(),
    "IN",
  );
}

export async function getNextVoucherNumber() {
  return incrementSequentialNumber(await getLatestVoucherNumber());
}

export async function getNextPettyCashNumber() {
  return incrementPrefixedSequentialNumber(
    await getLatestPettyCashNumber(),
    "PC",
  );
}

export async function listInvoices(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  const filter = scope(session);
  const periodFilter = buildReportPeriodScope("invoice_date", period, context);
  return queryRows<InvoiceRecord>(
    `SELECT id,
      invoice_number AS invoiceNumber,
      tin,
      invoice_date AS invoiceDate,
      director AS customerName,
      phone,
      payment_method AS paymentMethod,
      bank_account AS bankAccount,
      holder_name AS holderName,
      bank_name AS bankName,
      mobile_number AS mobileNumber,
      mobile_holder AS mobileHolder,
      mobile_operator AS mobileOperator,
      subtotal,
      vat,
      discount,
      grand_total AS grandTotal,
      user_id AS userId,
      created_at AS createdAt
     FROM invoices${filter.clause}${periodFilter.clause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...filter.params, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function listReceipts(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  const filter = scope(session);
  const periodFilter = buildReportPeriodScope("receipt_date", period, context);
  return queryRows<ReceiptRecord>(
    `SELECT id,
      receipt_number AS receiptNumber,
      customer_name AS customerName,
      code,
      type,
      category,
      description,
      phone,
      amount,
      payment_method AS paymentMethod,
      bank_name AS bankName,
      branch_name AS branchName,
      reference_number AS referenceNumber,
      receipt_date AS receiptDate,
      user_id AS userId,
      created_at AS createdAt
     FROM receipts${filter.clause}${periodFilter.clause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...filter.params, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function listPettyCash(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  const filter = scope(session);
  const periodFilter = buildReportPeriodScope("date", period, context);
  return queryRows<PettyCashRecord>(
    `SELECT id,
      date,
      code,
      type,
      description,
      category,
      amount,
      pettycash_number AS pettycashNumber,
      reference_number AS referenceNumber,
      user_id AS userId,
      created_at AS createdAt
     FROM petty_cash_transactions${filter.clause}${periodFilter.clause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...filter.params, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function listVouchers(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  const filter = scope(session);
  const periodFilter = buildReportPeriodScope("date", period, context);
  return queryRows<VoucherRecord>(
    `SELECT id,
      voucher_number AS voucherNumber,
      date,
      customer_name AS customerName,
      payment_method AS paymentMethod,
      bank_name AS bankName,
      account_number AS accountNumber,
      account_name AS accountName,
      bank_reference AS bankReference,
      mobile_number AS mobileNumber,
      payer_name AS payerName,
      mobile_reference AS mobileReference,
      code,
      type,
      category,
      description,
      amount,
      status,
      admin_comment AS adminComment,
      approved_by AS approvedBy,
      approved_at AS approvedAt,
      rejected_by AS rejectedBy,
      rejected_at AS rejectedAt,
      user_id AS userId,
      created_at AS createdAt
     FROM payment_vouchers${filter.clause}${periodFilter.clause}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...filter.params, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function listLetters(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  const filterClause = session.role === "admin" ? "" : " AND pl.user_id = ?";
  const filterParams = session.role === "admin" ? [] : [session.userId];
  const periodFilter = buildReportPeriodScope("pl.created_at", period, context);
  return queryRows<LetterRecord>(
    `SELECT pl.id,
      pl.name,
      pl.description,
      pl.pdf_path AS pdfPath,
      lc.letter_date AS letterDate,
      lc.receiver_address AS receiverAddress,
      lc.heading,
      lc.body,
      pl.user_id AS userId,
      pl.created_at AS createdAt,
      COALESCE(lc.updated_at, pl.created_at) AS updatedAt
     FROM printed_letters pl
      LEFT JOIN letter_content lc ON lc.letter_id = pl.id
     WHERE 1 = 1${filterClause}${periodFilter.clause}
     ORDER BY pl.created_at DESC
     LIMIT ?`,
    [...filterParams, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function getInvoiceDocument(
  session: SessionUser,
  invoiceId: number,
) {
  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  const invoice = await firstOrNull<InvoiceRecord>(
    `SELECT id,
      invoice_number AS invoiceNumber,
      tin,
      invoice_date AS invoiceDate,
      director AS customerName,
      phone,
      payment_method AS paymentMethod,
      bank_account AS bankAccount,
      holder_name AS holderName,
      bank_name AS bankName,
      mobile_number AS mobileNumber,
      mobile_holder AS mobileHolder,
      mobile_operator AS mobileOperator,
      subtotal,
      vat,
      discount,
      grand_total AS grandTotal,
      user_id AS userId,
      created_at AS createdAt
     FROM invoices
     WHERE id = ?${accessClause}
     LIMIT 1`,
    session.role === "admin" ? [invoiceId] : [invoiceId, session.userId],
  );

  if (!invoice) {
    return null;
  }

  const items = await queryRows<InvoiceItemRecord>(
    `SELECT id, description, quantity, unit_price AS unitPrice, total
     FROM invoice_items
     WHERE invoice_id = ?
     ORDER BY id ASC`,
    [invoiceId],
  ).catch(() => []);

  return { invoice, items };
}

export async function getReceiptDocument(
  session: SessionUser,
  receiptId: number,
) {
  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  return firstOrNull<ReceiptRecord>(
    `SELECT id,
      receipt_number AS receiptNumber,
      customer_name AS customerName,
      code,
      type,
      category,
      description,
      phone,
      amount,
      payment_method AS paymentMethod,
      bank_name AS bankName,
      branch_name AS branchName,
      reference_number AS referenceNumber,
      receipt_date AS receiptDate,
      user_id AS userId,
      created_at AS createdAt
     FROM receipts
     WHERE id = ?${accessClause}
     LIMIT 1`,
    session.role === "admin" ? [receiptId] : [receiptId, session.userId],
  );
}

export async function getPettyCashDocument(
  session: SessionUser,
  pettyCashId: number,
) {
  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  return firstOrNull<PettyCashRecord>(
    `SELECT id,
      date,
      code,
      type,
      description,
      category,
      amount,
      pettycash_number AS pettycashNumber,
      reference_number AS referenceNumber,
      user_id AS userId,
      created_at AS createdAt
     FROM petty_cash_transactions
     WHERE id = ?${accessClause}
     LIMIT 1`,
    session.role === "admin" ? [pettyCashId] : [pettyCashId, session.userId],
  );
}

export async function getVoucherDocument(
  session: SessionUser,
  voucherId: number,
) {
  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  return firstOrNull<VoucherRecord>(
    `SELECT id,
      voucher_number AS voucherNumber,
      date,
      customer_name AS customerName,
      payment_method AS paymentMethod,
      bank_name AS bankName,
      account_number AS accountNumber,
      account_name AS accountName,
      bank_reference AS bankReference,
      mobile_number AS mobileNumber,
      payer_name AS payerName,
      mobile_reference AS mobileReference,
      code,
      type,
      category,
      description,
      amount,
      status,
      admin_comment AS adminComment,
      approved_by AS approvedBy,
      approved_at AS approvedAt,
      rejected_by AS rejectedBy,
      rejected_at AS rejectedAt,
      user_id AS userId,
      created_at AS createdAt
     FROM payment_vouchers
     WHERE id = ?${accessClause}
     LIMIT 1`,
    session.role === "admin" ? [voucherId] : [voucherId, session.userId],
  );
}

export async function getLetterDocument(
  session: SessionUser,
  letterId: number,
) {
  const accessClause = session.role === "admin" ? "" : " AND pl.user_id = ?";
  const letter = await firstOrNull<LetterRecord>(
    `SELECT pl.id,
      pl.name,
      pl.description,
      pl.pdf_path AS pdfPath,
      lc.letter_date AS letterDate,
      lc.receiver_address AS receiverAddress,
      lc.heading,
      lc.body,
      pl.user_id AS userId,
      pl.created_at AS createdAt,
      pl.created_at AS updatedAt
     FROM printed_letters pl
     LEFT JOIN letter_content lc ON lc.letter_id = pl.id
     WHERE pl.id = ?${accessClause}
     LIMIT 1`,
    session.role === "admin" ? [letterId] : [letterId, session.userId],
  );

  return letter;
}

export async function listIncomingLetters(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  await ensureIncomingLettersTable();
  const filter = scope(session);
  const periodFilter = buildReportPeriodScope("received_date", period, context);
  return queryRows<IncomingLetterRecord>(
    `SELECT id,
      sender_name AS senderName,
      sender_organization AS senderOrganization,
      subject,
      category,
      received_date AS receivedDate,
      pdf_path AS pdfPath,
      original_file_name AS originalFileName,
      description,
      user_id AS userId,
      created_at AS createdAt
     FROM incoming_letters${filter.clause}${periodFilter.clause}
     ORDER BY received_date DESC, created_at DESC
     LIMIT ?`,
    [...filter.params, ...periodFilter.params, limit],
  ).catch(() => []);
}

export async function getIncomingLetterDocument(
  session: SessionUser,
  id: number,
) {
  await ensureIncomingLettersTable();
  const filter = scope(session);
  const letter = await queryRows<IncomingLetterRecord>(
    `SELECT id,
      sender_name AS senderName,
      sender_organization AS senderOrganization,
      subject,
      category,
      received_date AS receivedDate,
      pdf_path AS pdfPath,
      original_file_name AS originalFileName,
      description,
      user_id AS userId,
      created_at AS createdAt
     FROM incoming_letters
     WHERE id = ?${filter.clause.replace("WHERE", "AND")}`,
    [id, ...filter.params],
  );

  return letter[0] ?? null;
}
