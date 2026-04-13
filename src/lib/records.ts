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

type SendChannel = "whatsapp" | "email";

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
  sentAt: string | null;
  sentBy: number | null;
  sentVia: SendChannel | null;
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
  sentAt: string | null;
  sentBy: number | null;
  sentVia: SendChannel | null;
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
  referenceNumber: string | null;
  description: string | null;
  pdfPath: string;
  letterDate: string | null;
  receiverAddress: string | null;
  heading: string | null;
  body: string | null;
  status: "pending" | "approved";
  approvedBy: number | null;
  approvedAt: string | null;
  approvedSignaturePath: string | null;
  sentAt: string | null;
  sentBy: number | null;
  sentVia: SendChannel | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type IncomingLetterRecord = {
  id: number;
  referenceNumber: string | null;
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

function scope(_session: SessionUser): Scope {
  return { clause: " WHERE 1 = 1", params: [] };
}

let printedLettersTableReady: Promise<void> | null = null;
let incomingLettersTableReady: Promise<void> | null = null;
let documentWorkflowColumnsReady: Promise<void> | null = null;

export function ensureDocumentWorkflowColumns() {
  if (!documentWorkflowColumnsReady) {
    documentWorkflowColumnsReady = execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS signature_image_path VARCHAR(500) NULL
    `)
      .then(() =>
        execute(`
          ALTER TABLE invoices
          ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE invoices
          ADD COLUMN IF NOT EXISTS sent_by INT NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE invoices
          ADD COLUMN IF NOT EXISTS sent_via ENUM('whatsapp', 'email') NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE receipts
          ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE receipts
          ADD COLUMN IF NOT EXISTS sent_by INT NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE receipts
          ADD COLUMN IF NOT EXISTS sent_via ENUM('whatsapp', 'email') NULL
        `),
      )
      .then(() => undefined);
  }

  return documentWorkflowColumnsReady;
}

function ensurePrintedLettersTable() {
  if (!printedLettersTableReady) {
    printedLettersTableReady = execute(`
      CREATE TABLE IF NOT EXISTS printed_letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        reference_number VARCHAR(50),
        description TEXT,
        pdf_path VARCHAR(500) NOT NULL,
        status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
        approved_by INT,
        approved_at TIMESTAMP NULL,
        approved_signature_path VARCHAR(500),
        sent_at TIMESTAMP NULL,
        sent_by INT,
        sent_via ENUM('whatsapp', 'email') NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_printed_letters_user_created (user_id, created_at),
        KEY idx_printed_letters_status_created (status, created_at),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (sent_by) REFERENCES users(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50) NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending'
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS approved_by INT NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS approved_signature_path VARCHAR(500) NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS sent_by INT NULL
        `),
      )
      .then(() =>
        execute(`
          ALTER TABLE printed_letters
          ADD COLUMN IF NOT EXISTS sent_via ENUM('whatsapp', 'email') NULL
        `),
      )
      .then(() => undefined);
  }

  return printedLettersTableReady;
}

export function ensureLetterWorkflowColumns() {
  return ensurePrintedLettersTable();
}

function ensureIncomingLettersTable() {
  if (!incomingLettersTableReady) {
    incomingLettersTableReady = execute(`
      CREATE TABLE IF NOT EXISTS incoming_letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_number VARCHAR(50),
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
      .then(() =>
        execute(`
          ALTER TABLE incoming_letters
          ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50) NULL
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
  minimumDigits = 3,
) {
  const text = (value ?? "").trim();
  const numericSuffix = text.startsWith(prefix)
    ? text.slice(prefix.length)
    : (text.match(/(\d+)$/)?.[1] ?? "");
  const parsed = Number(numericSuffix);

  if (numericSuffix && Number.isFinite(parsed)) {
    return `${prefix}${String(parsed + 1).padStart(Math.max(numericSuffix.length, minimumDigits), "0")}`;
  }

  return `${prefix}${String(1).padStart(minimumDigits, "0")}`;
}

function getCurrentDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatOweruLetterReference(dateStamp: string, sequence: number) {
  return `OWERU-${dateStamp}-${String(sequence).padStart(4, "0")}`;
}

async function getLatestReceiptNumber() {
  const record = await firstOrNull<{ receiptNumber: string }>(
    `SELECT receipt_number AS receiptNumber
     FROM receipts
     ORDER BY CASE
       WHEN receipt_number LIKE 'RC%' THEN CAST(SUBSTRING(receipt_number, 3) AS UNSIGNED)
       ELSE CAST(receipt_number AS UNSIGNED)
     END DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.receiptNumber ?? null;
}

async function getLatestVoucherNumber() {
  const record = await firstOrNull<{ voucherNumber: string }>(
    `SELECT voucher_number AS voucherNumber
     FROM payment_vouchers
     WHERE voucher_number LIKE 'VN%'
     ORDER BY CAST(SUBSTRING(voucher_number, 3) AS UNSIGNED) DESC, created_at DESC
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
     WHERE pettycash_number LIKE 'PCN%'
     ORDER BY CAST(SUBSTRING(pettycash_number, 4) AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.pettyCashNumber ?? null;
}

async function getLatestLetterReferenceNumber(dateStamp: string) {
  await ensurePrintedLettersTable();

  const record = await firstOrNull<{ referenceNumber: string }>(
    `SELECT reference_number AS referenceNumber
     FROM printed_letters
     WHERE reference_number LIKE ?
     ORDER BY CAST(SUBSTRING_INDEX(reference_number, '-', -1) AS UNSIGNED) DESC, created_at DESC
     LIMIT 1`,
    [`OWERU-${dateStamp}-%`],
  );

  return record?.referenceNumber ?? null;
}

async function getLatestIncomingLetterReferenceNumber() {
  await ensureIncomingLettersTable();

  const record = await firstOrNull<{ referenceNumber: string }>(
    `SELECT COALESCE(
       NULLIF(reference_number, ''),
       CONCAT('IL', LPAD(id, 3, '0'))
     ) AS referenceNumber
     FROM incoming_letters
     ORDER BY CAST(
       SUBSTRING(
         COALESCE(NULLIF(reference_number, ''), CONCAT('IL', LPAD(id, 3, '0'))),
         3
       ) AS UNSIGNED
     ) DESC, created_at DESC
     LIMIT 1`,
    [],
  );

  return record?.referenceNumber ?? null;
}

export async function getNextReceiptNumber() {
  return incrementPrefixedSequentialNumber(await getLatestReceiptNumber(), "RC");
}

export async function getNextInvoiceNumber() {
  return incrementPrefixedSequentialNumber(
    await getLatestInvoiceNumber(),
    "IN",
  );
}

export async function getNextVoucherNumber() {
  return incrementPrefixedSequentialNumber(await getLatestVoucherNumber(), "PVN");
}

export async function getNextPettyCashNumber() {
  return incrementPrefixedSequentialNumber(
    await getLatestPettyCashNumber(),
    "PCN",
  );
}

export async function getNextLetterReferenceNumber() {
  const dateStamp = getCurrentDateStamp();
  const latestReference = await getLatestLetterReferenceNumber(dateStamp);
  const latestMatch = latestReference?.match(/^OWERU-\d{8}-(\d+)$/);
  const latestSequence = latestMatch ? Number(latestMatch[1]) : 0;
  const nextSequence = Number.isFinite(latestSequence)
    ? latestSequence + 1
    : 1;

  return formatOweruLetterReference(dateStamp, nextSequence);
}

export async function getNextIncomingLetterReferenceNumber() {
  return incrementPrefixedSequentialNumber(
    await getLatestIncomingLetterReferenceNumber(),
    "IL",
  );
}

export async function listInvoices(
  session: SessionUser,
  limit = 20,
  period: ReportPeriod = "all",
  context?: ReportPeriodContext,
) {
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
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
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
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
  await ensurePrintedLettersTable();
  const periodFilter = buildReportPeriodScope("pl.created_at", period, context);
  return queryRows<LetterRecord>(
    `SELECT pl.id,
      pl.name,
      COALESCE(
        NULLIF(pl.reference_number, ''),
        CONCAT('OWERU-', DATE_FORMAT(pl.created_at, '%Y%m%d'), '-', LPAD(pl.id, 4, '0'))
      ) AS referenceNumber,
      pl.description,
      pl.pdf_path AS pdfPath,
      lc.letter_date AS letterDate,
      lc.receiver_address AS receiverAddress,
      lc.heading,
      lc.body,
      pl.status,
      pl.approved_by AS approvedBy,
      pl.approved_at AS approvedAt,
      pl.approved_signature_path AS approvedSignaturePath,
      pl.sent_at AS sentAt,
      pl.sent_by AS sentBy,
      pl.sent_via AS sentVia,
      pl.user_id AS userId,
      pl.created_at AS createdAt,
      COALESCE(lc.updated_at, pl.created_at) AS updatedAt
     FROM printed_letters pl
      LEFT JOIN letter_content lc ON lc.letter_id = pl.id
       WHERE 1 = 1${periodFilter.clause}
     ORDER BY pl.created_at DESC
     LIMIT ?`,
      [...periodFilter.params, limit],
  ).catch(() => []);
}

export async function getInvoiceDocument(
  session: SessionUser,
  invoiceId: number,
) {
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
      user_id AS userId,
      created_at AS createdAt
     FROM invoices
     WHERE id = ?
     LIMIT 1`,
    [invoiceId],
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

export async function getInvoiceDocumentPublic(invoiceId: number) {
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
      user_id AS userId,
      created_at AS createdAt
     FROM invoices
     WHERE id = ?
     LIMIT 1`,
    [invoiceId],
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
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
      user_id AS userId,
      created_at AS createdAt
     FROM receipts
     WHERE id = ?
     LIMIT 1`,
    [receiptId],
  );
}

export async function getReceiptDocumentPublic(receiptId: number) {
  await ensureDocumentWorkflowColumns();
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
      sent_at AS sentAt,
      sent_by AS sentBy,
      sent_via AS sentVia,
      user_id AS userId,
      created_at AS createdAt
     FROM receipts
     WHERE id = ?
     LIMIT 1`,
    [receiptId],
  );
}

export async function getPettyCashDocument(
  session: SessionUser,
  pettyCashId: number,
) {
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
     WHERE id = ?
     LIMIT 1`,
    [pettyCashId],
  );
}

export async function getVoucherDocument(
  session: SessionUser,
  voucherId: number,
) {
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
     WHERE id = ?
     LIMIT 1`,
    [voucherId],
  );
}

export async function getLetterDocument(
  session: SessionUser,
  letterId: number,
) {
  await ensurePrintedLettersTable();
  const letter = await firstOrNull<LetterRecord>(
    `SELECT pl.id,
      pl.name,
      COALESCE(
        NULLIF(pl.reference_number, ''),
        CONCAT('OWERU-', DATE_FORMAT(pl.created_at, '%Y%m%d'), '-', LPAD(pl.id, 4, '0'))
      ) AS referenceNumber,
      pl.description,
      pl.pdf_path AS pdfPath,
      lc.letter_date AS letterDate,
      lc.receiver_address AS receiverAddress,
      lc.heading,
      lc.body,
      pl.status,
      pl.approved_by AS approvedBy,
      pl.approved_at AS approvedAt,
      pl.approved_signature_path AS approvedSignaturePath,
      pl.sent_at AS sentAt,
      pl.sent_by AS sentBy,
      pl.sent_via AS sentVia,
      pl.user_id AS userId,
      pl.created_at AS createdAt,
      pl.created_at AS updatedAt
     FROM printed_letters pl
     LEFT JOIN letter_content lc ON lc.letter_id = pl.id
     WHERE pl.id = ?
     LIMIT 1`,
    [letterId],
  );

  return letter;
}

export async function getLetterDocumentPublic(letterId: number) {
  await ensurePrintedLettersTable();
  return firstOrNull<LetterRecord>(
    `SELECT pl.id,
      pl.name,
      COALESCE(
        NULLIF(pl.reference_number, ''),
        CONCAT('OWERU-', DATE_FORMAT(pl.created_at, '%Y%m%d'), '-', LPAD(pl.id, 4, '0'))
      ) AS referenceNumber,
      pl.description,
      pl.pdf_path AS pdfPath,
      lc.letter_date AS letterDate,
      lc.receiver_address AS receiverAddress,
      lc.heading,
      lc.body,
      pl.status,
      pl.approved_by AS approvedBy,
      pl.approved_at AS approvedAt,
      pl.approved_signature_path AS approvedSignaturePath,
      pl.sent_at AS sentAt,
      pl.sent_by AS sentBy,
      pl.sent_via AS sentVia,
      pl.user_id AS userId,
      pl.created_at AS createdAt,
      pl.created_at AS updatedAt
     FROM printed_letters pl
     LEFT JOIN letter_content lc ON lc.letter_id = pl.id
     WHERE pl.id = ?
     LIMIT 1`,
    [letterId],
  );
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
      COALESCE(
        NULLIF(reference_number, ''),
        CONCAT('IL', LPAD(id, 3, '0'))
      ) AS referenceNumber,
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
      COALESCE(
        NULLIF(reference_number, ''),
        CONCAT('IL', LPAD(id, 3, '0'))
      ) AS referenceNumber,
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
