"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ResultSetHeader } from "mysql2/promise";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { execute, withTransaction } from "@/lib/db";
import { getNextInvoiceNumber, getNextPettyCashNumber } from "@/lib/records";
import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
  FIXED_MOBILE_HOLDER_NAME,
  FIXED_MOBILE_NUMBER,
  FIXED_MOBILE_OPERATOR,
  FIXED_TIN_NUMBER,
} from "@/lib/payment-defaults";
import { getCurrentSession } from "@/lib/session-server";

function goWithMessage(
  path: string,
  type: "status" | "error",
  message: string,
): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }
  return session;
}

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: FormDataEntryValue | null) {
  const parsed = Number(asString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function parseInvoiceItems(raw: FormDataEntryValue | null) {
  const text = asString(raw);

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [description = "", quantity = "1", unitPrice = "0"] = line
        .split("|")
        .map((segment) => segment.trim());
      return {
        description,
        quantity: Math.max(1, Number(quantity) || 1),
        unitPrice: Number(unitPrice) || 0,
      };
    })
    .filter((item) => item.description.length > 0);
}

function buildLetterBody(customMessage: string) {
  return customMessage.trim();
}

function splitLetterBody(body: string | null | undefined) {
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

const invoiceSchema = z.object({
  invoice_number: z.string().min(1),
  tin: z.string().min(1),
  invoice_date: z.string().min(1),
  director: z.string().min(1),
  phone: z.string().min(1),
});

export async function createInvoiceAction(formData: FormData) {
  const session = await requireSession();
  const invoiceNumber = await getNextInvoiceNumber();
  const paymentMethod = asString(formData.get("payment_method")) || "Cash";
  const bankName =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_NAME : null;
  const bankAccount =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NUMBER : null;
  const holderName =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NAME : null;
  const mobileNumber =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_NUMBER : null;
  const mobileHolder =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_HOLDER_NAME : null;
  const mobileOperator =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_OPERATOR : null;

  if (
    paymentMethod === "Bank Transfer" &&
    (!bankName || !bankAccount || !holderName)
  ) {
    goWithMessage(
      "/invoices",
      "error",
      "Bank name, account number, and account holder name are required for bank transfer invoices.",
    );
  }

  if (
    paymentMethod === "Mobile Money" &&
    (!mobileNumber || !mobileHolder || !mobileOperator)
  ) {
    goWithMessage(
      "/invoices",
      "error",
      "Mobile number, mobile holder name, and mobile operator are required for mobile money invoices.",
    );
  }

  const parsed = invoiceSchema.safeParse({
    invoice_number: formData.get("invoice_number"),
    tin: FIXED_TIN_NUMBER,
    invoice_date: formData.get("invoice_date"),
    director: formData.get("director"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/invoices",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid invoice data",
    );
  }

  const items = parseInvoiceItems(formData.get("items"));
  if (!items.length) {
    goWithMessage(
      "/invoices",
      "error",
      "Add at least one invoice item using description|quantity|unit price on each line.",
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const vat = formData.has("vat") ? asNumber(formData.get("vat")) : 0;
  const discount = asNumber(formData.get("discount"));
  const grandTotal = Math.max(subtotal + vat - discount, 0);

  await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO invoices (
        invoice_number, tin, invoice_date, director, phone,
        payment_method, bank_account, holder_name, bank_name,
        mobile_number, mobile_holder, mobile_operator,
        subtotal, vat, discount, grand_total, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        parsed.data.tin,
        parsed.data.invoice_date,
        parsed.data.director,
        parsed.data.phone,
        paymentMethod,
        bankAccount,
        holderName,
        bankName,
        mobileNumber,
        mobileHolder,
        mobileOperator,
        subtotal,
        vat,
        discount,
        grandTotal,
        session.userId,
      ],
    );

    const invoiceId = result.insertId;
    const itemValues = items.map((item) => [
      invoiceId,
      item.description,
      item.quantity,
      item.unitPrice,
      item.quantity * item.unitPrice,
    ]);

    for (const item of itemValues) {
      await connection.execute(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?)`,
        item,
      );
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  goWithMessage("/invoices", "status", "Invoice saved successfully.");
}

const invoiceUpdateSchema = invoiceSchema.extend({
  invoice_id: z.coerce.number().int().positive(),
});

export async function updateInvoiceAction(formData: FormData) {
  const session = await requireSession();
  const paymentMethod = asString(formData.get("payment_method")) || "Cash";
  const bankName =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_NAME : null;
  const bankAccount =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NUMBER : null;
  const holderName =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NAME : null;
  const mobileNumber =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_NUMBER : null;
  const mobileHolder =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_HOLDER_NAME : null;
  const mobileOperator =
    paymentMethod === "Mobile Money" ? FIXED_MOBILE_OPERATOR : null;

  if (
    paymentMethod === "Bank Transfer" &&
    (!bankName || !bankAccount || !holderName)
  ) {
    goWithMessage(
      "/invoices",
      "error",
      "Bank name, account number, and account holder name are required for bank transfer invoices.",
    );
  }

  if (
    paymentMethod === "Mobile Money" &&
    (!mobileNumber || !mobileHolder || !mobileOperator)
  ) {
    goWithMessage(
      "/invoices",
      "error",
      "Mobile number, mobile holder name, and mobile operator are required for mobile money invoices.",
    );
  }

  const parsed = invoiceUpdateSchema.safeParse({
    invoice_id: formData.get("invoice_id"),
    invoice_number: formData.get("invoice_number"),
    tin: FIXED_TIN_NUMBER,
    invoice_date: formData.get("invoice_date"),
    director: formData.get("director"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/invoices",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid invoice data",
    );
  }

  const items = parseInvoiceItems(formData.get("items"));
  if (!items.length) {
    goWithMessage(
      "/invoices",
      "error",
      "Add at least one invoice item using description|quantity|unit price on each line.",
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const vat = formData.has("vat") ? asNumber(formData.get("vat")) : 0;
  const discount = asNumber(formData.get("discount"));
  const grandTotal = Math.max(subtotal + vat - discount, 0);
  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  const invoiceParams =
    session.role === "admin"
      ? [
          parsed.data.invoice_number,
          parsed.data.tin,
          parsed.data.invoice_date,
          parsed.data.director,
          parsed.data.phone,
          paymentMethod,
          bankAccount,
          holderName,
          bankName,
          mobileNumber,
          mobileHolder,
          mobileOperator,
          subtotal,
          vat,
          discount,
          grandTotal,
          parsed.data.invoice_id,
        ]
      : [
          parsed.data.invoice_number,
          parsed.data.tin,
          parsed.data.invoice_date,
          parsed.data.director,
          parsed.data.phone,
          paymentMethod,
          bankAccount,
          holderName,
          bankName,
          mobileNumber,
          mobileHolder,
          mobileOperator,
          subtotal,
          vat,
          discount,
          grandTotal,
          parsed.data.invoice_id,
          session.userId,
        ];

  await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE invoices
         SET invoice_number = ?, tin = ?, invoice_date = ?, director = ?, phone = ?,
           payment_method = ?, bank_account = ?, holder_name = ?, bank_name = ?,
           mobile_number = ?, mobile_holder = ?, mobile_operator = ?,
           subtotal = ?, vat = ?, discount = ?, grand_total = ?
       WHERE id = ?${accessClause}`,
      invoiceParams,
    );

    if (result.affectedRows === 0) {
      goWithMessage("/invoices", "error", "Invoice not found.");
    }

    await connection.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [
      parsed.data.invoice_id,
    ]);

    for (const item of items) {
      await connection.execute(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?)`,
        [
          parsed.data.invoice_id,
          item.description,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
        ],
      );
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  goWithMessage("/invoices", "status", "Invoice updated successfully.");
}

const receiptSchema = z.object({
  receipt_number: z.string().min(1),
  customer_name: z.string().min(1),
  receipt_date: z.string().min(1),
  payment_method: z.string().min(1),
  amount: z.coerce.number().positive(),
});

type ReceiptActionState = {
  status?: string;
  error?: string;
  token?: string;
};

function finishReceiptAction(
  path: string,
  type: "status" | "error",
  message: string,
  isAsync: boolean,
): ReceiptActionState | never {
  if (isAsync) {
    return type === "status"
      ? { status: message, token: randomUUID() }
      : { error: message, token: randomUUID() };
  }

  goWithMessage(path, type, message);
}

export async function createReceiptAction(
  maybeStateOrFormData: ReceiptActionState | FormData,
  maybeFormData?: FormData,
) {
  const formData = maybeFormData ?? maybeStateOrFormData;
  if (!(formData instanceof FormData)) {
    throw new Error("Invalid receipt submission.");
  }

  const session = await requireSession();
  const paymentMethod = asString(formData.get("payment_method")) || "Cash";
  const bankName = FIXED_BANK_NAME;
  const referenceNumber = asString(formData.get("reference_number")) || null;
  const isAsync = asString(formData.get("__async")) === "1";

  if (paymentMethod === "Bank Transfer" && (!bankName || !referenceNumber)) {
    return finishReceiptAction(
      "/receipts",
      "error",
      "Bank name and reference number are required for bank transfer receipts.",
      isAsync,
    );
  }

  const parsed = receiptSchema.safeParse({
    receipt_number: formData.get("receipt_number"),
    customer_name: formData.get("customer_name"),
    receipt_date: formData.get("receipt_date"),
    payment_method: formData.get("payment_method"),
    amount: asNumber(formData.get("amount")),
  });

  if (!parsed.success) {
    return finishReceiptAction(
      "/receipts",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid receipt data",
      isAsync,
    );
  }

  await execute(
    `INSERT INTO receipts (
      receipt_number, customer_name, code, type, category, description,
      phone, amount, payment_method, bank_name,
      reference_number, receipt_date, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.data.receipt_number,
      parsed.data.customer_name,
      asString(formData.get("code")) || null,
      asString(formData.get("type")) || null,
      asString(formData.get("category")) || null,
      asString(formData.get("description")) || null,
      asString(formData.get("phone")) || null,
      parsed.data.amount,
      parsed.data.payment_method,
      bankName,
      referenceNumber,
      parsed.data.receipt_date,
      session.userId,
    ],
  );

  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  return finishReceiptAction(
    "/receipts",
    "status",
    "Receipt saved successfully.",
    isAsync,
  );
}

const receiptUpdateSchema = receiptSchema.extend({
  receipt_id: z.coerce.number().int().positive(),
});

export async function updateReceiptAction(
  maybeStateOrFormData: ReceiptActionState | FormData,
  maybeFormData?: FormData,
) {
  const formData = maybeFormData ?? maybeStateOrFormData;
  if (!(formData instanceof FormData)) {
    throw new Error("Invalid receipt submission.");
  }

  const session = await requireSession();
  const isAsync = asString(formData.get("__async")) === "1";
  const bankName = FIXED_BANK_NAME;
  const parsed = receiptUpdateSchema.safeParse({
    receipt_id: formData.get("receipt_id"),
    receipt_number: formData.get("receipt_number"),
    customer_name: formData.get("customer_name"),
    receipt_date: formData.get("receipt_date"),
    payment_method: formData.get("payment_method"),
    amount: asNumber(formData.get("amount")),
  });

  if (!parsed.success) {
    return finishReceiptAction(
      "/receipts",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid receipt data",
      isAsync,
    );
  }

  const accessClause = session.role === "admin" ? "" : " AND user_id = ?";
  const params =
    session.role === "admin"
      ? [
          parsed.data.receipt_number,
          parsed.data.customer_name,
          asString(formData.get("code")) || null,
          asString(formData.get("type")) || null,
          asString(formData.get("category")) || null,
          asString(formData.get("description")) || null,
          asString(formData.get("phone")) || null,
          parsed.data.amount,
          parsed.data.payment_method,
          bankName,
          asString(formData.get("reference_number")) || null,
          parsed.data.receipt_date,
          parsed.data.receipt_id,
        ]
      : [
          parsed.data.receipt_number,
          parsed.data.customer_name,
          asString(formData.get("code")) || null,
          asString(formData.get("type")) || null,
          asString(formData.get("category")) || null,
          asString(formData.get("description")) || null,
          asString(formData.get("phone")) || null,
          parsed.data.amount,
          parsed.data.payment_method,
          bankName,
          asString(formData.get("reference_number")) || null,
          parsed.data.receipt_date,
          parsed.data.receipt_id,
          session.userId,
        ];

  const result = await execute(
    `UPDATE receipts
     SET receipt_number = ?, customer_name = ?, code = ?, type = ?, category = ?, description = ?,
         phone = ?, amount = ?, payment_method = ?, bank_name = ?,
         reference_number = ?, receipt_date = ?
     WHERE id = ?${accessClause}`,
    params,
  );

  if (result.affectedRows === 0) {
    return finishReceiptAction(
      "/receipts",
      "error",
      "Receipt not found.",
      isAsync,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  return finishReceiptAction(
    "/receipts",
    "status",
    "Receipt updated successfully.",
    isAsync,
  );
}

const pettyCashSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createPettyCashAction(formData: FormData) {
  const session = await requireSession();
  const pettyCashNumber = await getNextPettyCashNumber();
  const parsed = pettyCashSchema.safeParse({
    date: formData.get("date"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: asNumber(formData.get("amount")),
  });

  if (!parsed.success) {
    goWithMessage(
      "/petty-cash",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid petty cash data",
    );
  }

  await execute(
    `INSERT INTO petty_cash_transactions (
      date, code, type, description, category, amount,
      pettycash_number, reference_number, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.data.date,
      asString(formData.get("code")) || null,
      asString(formData.get("type")) || null,
      parsed.data.description,
      parsed.data.category,
      parsed.data.amount,
      pettyCashNumber,
      asString(formData.get("reference_number")) || null,
      session.userId,
    ],
  );

  revalidatePath("/dashboard");
  revalidatePath("/petty-cash");
  goWithMessage(
    "/petty-cash",
    "status",
    "Petty cash record saved successfully.",
  );
}

const voucherSchema = z.object({
  voucher_number: z.string().min(1),
  date: z.string().min(1),
  payment_method: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function createVoucherAction(formData: FormData) {
  const session = await requireSession();
  const parsed = voucherSchema.safeParse({
    voucher_number: formData.get("voucher_number"),
    date: formData.get("date"),
    payment_method: formData.get("payment_method"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: asNumber(formData.get("amount")),
  });

  if (!parsed.success) {
    goWithMessage(
      "/payment-vouchers",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid voucher data",
    );
  }

  const paymentMethod = parsed.data.payment_method;
  const bankName = paymentMethod === "Bank Transfer" ? FIXED_BANK_NAME : null;
  const accountNumber =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NUMBER : null;
  const accountName =
    paymentMethod === "Bank Transfer" ? FIXED_BANK_ACCOUNT_NAME : null;
  const mobileNumber =
    paymentMethod === "Mobile Transaction" ? FIXED_MOBILE_NUMBER : null;
  const payerName =
    paymentMethod === "Mobile Transaction" ? FIXED_MOBILE_HOLDER_NAME : null;
  const mobileReference =
    paymentMethod === "Mobile Transaction" ? asString(formData.get("mobile_reference")) || null : null;

  await execute(
    `INSERT INTO payment_vouchers (
      voucher_number, date, customer_name, payment_method, bank_name, account_number,
      account_name, bank_reference, mobile_number, payer_name, mobile_reference,
      code, type, category, description, amount, status, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      parsed.data.voucher_number,
      parsed.data.date,
      asString(formData.get("customer_name")) || null,
      paymentMethod,
      bankName,
      accountNumber,
      accountName,
      asString(formData.get("bank_reference")) || null,
      mobileNumber,
      payerName,
      mobileReference,
      asString(formData.get("code")) || null,
      asString(formData.get("type")) || null,
      parsed.data.category,
      parsed.data.description,
      parsed.data.amount,
      session.userId,
    ],
  );

  revalidatePath("/dashboard");
  revalidatePath("/payment-vouchers");
  goWithMessage(
    "/payment-vouchers",
    "status",
    "Payment voucher saved successfully.",
  );
}

const voucherStatusSchema = z.object({
  voucher_id: z.coerce.number().int().positive(),
  status: z.enum(["approved", "rejected"]),
});

export async function updateVoucherStatusAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "admin") {
    goWithMessage(
      "/payment-vouchers",
      "error",
      "Only admins can approve vouchers.",
    );
  }

  const parsed = voucherStatusSchema.safeParse({
    voucher_id: formData.get("voucher_id"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/payment-vouchers",
      "error",
      "Invalid voucher status update.",
    );
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (parsed.data.status === "approved") {
    await execute(
      `UPDATE payment_vouchers
       SET status = 'approved', approved_by = ?, approved_at = ?, rejected_by = NULL, rejected_at = NULL
       WHERE id = ?`,
      [session.userId, now, parsed.data.voucher_id],
    );
  } else {
    await execute(
      `UPDATE payment_vouchers
       SET status = 'rejected', rejected_by = ?, rejected_at = ?, approved_by = NULL, approved_at = NULL
       WHERE id = ?`,
      [session.userId, now, parsed.data.voucher_id],
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/payment-vouchers");
  goWithMessage(
    "/payment-vouchers",
    "status",
    parsed.data.status === "approved"
      ? "Voucher approved."
      : "Voucher rejected.",
  );
}

const letterSchema = z.object({
  recipient_name: z.string().min(1),
  recipient_address: z.string().min(1),
  subject: z.string().min(1),
  letter_date: z.string().min(1),
  custom_message: z.string().min(1),
});

export async function createLetterAction(formData: FormData) {
  const session = await requireSession();
  const parsed = letterSchema.safeParse({
    recipient_name: formData.get("recipient_name"),
    recipient_address: formData.get("recipient_address"),
    subject: formData.get("subject"),
    letter_date: formData.get("letter_date"),
    custom_message: formData.get("custom_message"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/letters",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid letter data",
    );
  }

  await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO printed_letters (name, description, pdf_path, user_id)
       VALUES (?, ?, ?, ?)`,
      [
        parsed.data.recipient_name,
        parsed.data.subject,
        "generated",
        session.userId,
      ],
    );

    const letterId = result.insertId;
    const pdfPath = `/api/export/letter/${letterId}`;

    await connection.execute(
      "UPDATE printed_letters SET pdf_path = ? WHERE id = ?",
      [pdfPath, letterId],
    );

    await connection.execute(
      `INSERT INTO letter_content (letter_id, letter_date, receiver_address, heading, body)
       VALUES (?, ?, ?, ?, ?)`,
      [
        letterId,
        parsed.data.letter_date,
        parsed.data.recipient_address,
        parsed.data.subject,
        buildLetterBody(parsed.data.custom_message),
      ],
    );
  });

  revalidatePath("/dashboard");
  revalidatePath("/letters");
  goWithMessage("/letters", "status", "Letter saved successfully.");
}

const letterUpdateSchema = letterSchema.extend({
  letter_id: z.coerce.number().int().positive(),
});

export async function updateLetterAction(formData: FormData) {
  const session = await requireSession();
  const parsed = letterUpdateSchema.safeParse({
    letter_id: formData.get("letter_id"),
    recipient_name: formData.get("recipient_name"),
    recipient_address: formData.get("recipient_address"),
    subject: formData.get("subject"),
    letter_date: formData.get("letter_date"),
    custom_message: formData.get("custom_message"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/letters",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid letter data",
    );
  }

  await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE printed_letters
       SET name = ?, description = ?
       WHERE id = ?`,
      [parsed.data.recipient_name, parsed.data.subject, parsed.data.letter_id],
    );

    if (result.affectedRows === 0) {
      goWithMessage("/letters", "error", "Letter not found.");
    }

    await connection.execute(
      `INSERT INTO letter_content (letter_id, letter_date, receiver_address, heading, body)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         letter_date = VALUES(letter_date),
         receiver_address = VALUES(receiver_address),
         heading = VALUES(heading),
         body = VALUES(body)`,
      [
        parsed.data.letter_id,
        parsed.data.letter_date,
        parsed.data.recipient_address,
        parsed.data.subject,
        buildLetterBody(parsed.data.custom_message),
      ],
    );
  });

  revalidatePath("/dashboard");
  revalidatePath("/letters");
  goWithMessage("/letters", "status", "Letter updated successfully.");
}

const incomingLetterSchema = z.object({
  sender_name: z.string().min(1, "Sender name is required"),
  sender_organization: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  category: z.string().min(1, "Category is required"),
  received_date: z.string().date("Invalid date format"),
});

export async function createIncomingLetterAction(formData: FormData) {
  const session = await requireSession();
  const fileEntry = formData.get("letter_file");
  const parsed = incomingLetterSchema.safeParse({
    sender_name: formData.get("sender_name"),
    sender_organization: formData.get("sender_organization"),
    subject: formData.get("subject"),
    category: formData.get("category"),
    received_date: formData.get("received_date"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/letters",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid incoming letter data",
    );
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    goWithMessage("/letters", "error", "Incoming letter PDF file is required.");
  }

  const fileName = fileEntry.name.trim().toLowerCase();
  const isPdf =
    fileEntry.type === "application/pdf" || fileName.endsWith(".pdf");
  if (!isPdf) {
    goWithMessage("/letters", "error", "Incoming letter must be a PDF file.");
  }

  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "incoming-letters",
  );
  await mkdir(uploadDirectory, { recursive: true });

  const storedFileName = `${sanitizeFilename(parsed.data.sender_name || "incoming-letter")}-${randomUUID()}.pdf`;
  const storedFilePath = path.join(uploadDirectory, storedFileName);
  const pdfPath = `/uploads/incoming-letters/${storedFileName}`;
  const originalFileName = fileEntry.name.trim() || null;

  try {
    await writeFile(storedFilePath, Buffer.from(await fileEntry.arrayBuffer()));

    await execute(
      `INSERT INTO incoming_letters (
        sender_name,
        sender_organization,
        subject,
        category,
        received_date,
        pdf_path,
        original_file_name,
        description,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.data.sender_name,
        parsed.data.sender_organization || null,
        parsed.data.subject,
        parsed.data.category,
        parsed.data.received_date,
        pdfPath,
        originalFileName,
        null,
        session.userId,
      ],
    );
  } catch (error) {
    await unlink(storedFilePath).catch(() => undefined);
    throw error;
  }

  revalidatePath("/letters");
  goWithMessage("/letters", "status", "Incoming letter recorded successfully.");
}
