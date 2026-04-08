import { NextResponse } from "next/server";

import {
  listIncomingLetters,
  listInvoices,
  listLetters,
  listPettyCash,
  listReceipts,
  listVouchers,
} from "@/lib/records";
import {
  formatReportPeriodLabel,
  normalizeReportPeriod,
  type ReportPeriod,
  type ReportPeriodContext,
} from "@/lib/report-period";
import {
  buildReportPdfDocument,
  type ReportPdfInput,
  type ReportTableColumn,
} from "@/lib/report-pdf";
import { getCurrentSession } from "@/lib/session-server";

const MAX_EXPORT_ROWS = 5000;

type RouteParams = {
  params: Promise<{ entity: string }>;
};

type SupportedEntity =
  | "invoices"
  | "receipts"
  | "petty-cash"
  | "payment-vouchers"
  | "letters"
  | "incoming-letters";

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEntity(raw: string): SupportedEntity | null {
  const value = raw.trim().toLowerCase();

  if (value === "invoice" || value === "invoices") {
    return "invoices";
  }

  if (value === "receipt" || value === "receipts") {
    return "receipts";
  }

  if (value === "petty-cash" || value === "petty-cash-voucher") {
    return "petty-cash";
  }

  if (
    value === "payment-voucher" ||
    value === "payment-vouchers" ||
    value === "voucher" ||
    value === "vouchers"
  ) {
    return "payment-vouchers";
  }

  if (value === "letter" || value === "letters") {
    return "letters";
  }

  if (value === "incoming-letter" || value === "incoming-letters") {
    return "incoming-letters";
  }

  return null;
}

function entityLabel(entity: SupportedEntity) {
  if (entity === "invoices") {
    return "Invoices";
  }

  if (entity === "receipts") {
    return "Receipts";
  }

  if (entity === "petty-cash") {
    return "Petty Cash Vouchers";
  }

  if (entity === "payment-vouchers") {
    return "Payment Vouchers";
  }

  if (entity === "letters") {
    return "Letters";
  }

  return "Incoming Letters";
}

function buildFileName(entity: SupportedEntity, period: ReportPeriod) {
  const datePart = new Date().toISOString().slice(0, 10);
  return `oweru-${sanitizeFilePart(entity)}-${sanitizeFilePart(period)}-${datePart}.pdf`;
}

function readPeriodContext(requestUrl: URL): ReportPeriodContext {
  return {
    date: requestUrl.searchParams.get("date"),
    month: requestUrl.searchParams.get("month"),
    week: requestUrl.searchParams.get("week"),
  };
}

function formatCurrency(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDateTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function toText(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "-";
  }

  const text = String(value).trim();
  return text || "-";
}

function buildSummary(
  entity: SupportedEntity,
  period: ReportPeriod,
  context: ReportPeriodContext,
  rowCount: number,
  totalAmount?: number,
) {
  const periodLabel = formatReportPeriodLabel(period, context) ?? "All records";
  const baseSummary = [
    { label: "Records", value: String(rowCount) },
    { label: "Period", value: periodLabel },
  ];

  if (typeof totalAmount === "number") {
    return [
      ...baseSummary,
      { label: "Total amount", value: formatCurrency(totalAmount) },
    ];
  }

  return [
    ...baseSummary,
    {
      label: "Type",
      value: entityLabel(entity),
    },
  ];
}

function buildReportGeneratedAt() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function buildReportFootnote() {
  return "Generated from Oweru Management System records";
}

function createPdfInput(
  entity: SupportedEntity,
  period: ReportPeriod,
  context: ReportPeriodContext,
  generatedAt: string,
  columns: ReportTableColumn[],
  rows: string[][],
  totalAmount?: number,
) {
  return {
    title: `${entityLabel(entity)} Report`,
    subtitle: formatReportPeriodLabel(period, context) ?? "All records",
    generatedAt,
    summaryCards: buildSummary(entity, period, context, rows.length, totalAmount),
    columns,
    rows,
    footnote: buildReportFootnote(),
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access is required to export reports." },
      { status: 403 },
    );
  }

  const { entity: entityParam } = await params;
  const entity = normalizeEntity(entityParam);
  if (!entity) {
    return NextResponse.json({ error: "Unsupported report entity." }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const period = normalizeReportPeriod(requestUrl.searchParams.get("period"));
  const context = readPeriodContext(requestUrl);
  const generatedAt = buildReportGeneratedAt();

  let pdfInput: ReportPdfInput | null = null;

  if (entity === "invoices") {
    const records = await listInvoices(session, MAX_EXPORT_ROWS, period, context);
    const totalAmount = records.reduce((sum, record) => sum + Number(record.grandTotal ?? 0), 0);
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Invoice", weight: 1.1 },
        { header: "Date", weight: 0.8 },
        { header: "Customer", weight: 1.5 },
        { header: "Payment method", weight: 1, align: "center" },
        { header: "Total", weight: 0.9, align: "right" },
        { header: "Created by", weight: 0.8, align: "center" },
      ],
      records.map((record) => [
        toText(record.invoiceNumber),
        formatDateTime(record.invoiceDate),
        toText(record.customerName),
        toText(record.paymentMethod),
        formatCurrency(Number(record.grandTotal ?? 0)),
        `User ${toText(record.userId)}`,
      ]),
      totalAmount,
    );
  } else if (entity === "receipts") {
    const records = await listReceipts(session, MAX_EXPORT_ROWS, period, context);
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Receipt", weight: 1.1 },
        { header: "Date", weight: 0.8 },
        { header: "Customer", weight: 1.4 },
        { header: "Type", weight: 0.8, align: "center" },
        { header: "Amount", weight: 0.9, align: "right" },
        { header: "Payment method", weight: 1.1 },
      ],
      records.map((record) => [
        toText(record.receiptNumber),
        formatDateTime(record.receiptDate),
        toText(record.customerName),
        toText(record.type),
        formatCurrency(Number(record.amount ?? 0)),
        toText(record.paymentMethod),
      ]),
      totalAmount,
    );
  } else if (entity === "petty-cash") {
    const records = await listPettyCash(session, MAX_EXPORT_ROWS, period, context);
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Voucher", weight: 1.1 },
        { header: "Date", weight: 0.8 },
        { header: "Category", weight: 1.1 },
        { header: "Description", weight: 1.6 },
        { header: "Amount", weight: 0.9, align: "right" },
        { header: "Reference", weight: 1.1 },
      ],
      records.map((record) => [
        toText(record.pettycashNumber ?? record.code ?? record.referenceNumber),
        formatDateTime(record.date),
        toText(record.category),
        toText(record.description),
        formatCurrency(Number(record.amount ?? 0)),
        toText(record.referenceNumber),
      ]),
      totalAmount,
    );
  } else if (entity === "payment-vouchers") {
    const records = await listVouchers(session, MAX_EXPORT_ROWS, period, context);
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Voucher", weight: 1.1 },
        { header: "Date", weight: 0.8 },
        { header: "Customer", weight: 1.2 },
        { header: "Category", weight: 0.9 },
        { header: "Status", weight: 0.8, align: "center" },
        { header: "Amount", weight: 0.9, align: "right" },
        { header: "Payment method", weight: 1 },
      ],
      records.map((record) => [
        toText(record.voucherNumber),
        formatDateTime(record.date),
        toText(record.customerName),
        toText(record.category),
        toText(record.status),
        formatCurrency(Number(record.amount ?? 0)),
        toText(record.paymentMethod),
      ]),
      totalAmount,
    );
  } else if (entity === "letters") {
    const records = await listLetters(session, MAX_EXPORT_ROWS, period, context);
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Reference", weight: 0.9 },
        { header: "Recipient", weight: 1.4 },
        { header: "Subject", weight: 2 },
        { header: "Letter date", weight: 0.9 },
        { header: "Created at", weight: 0.9 },
        { header: "Created by", weight: 0.8, align: "center" },
      ],
      records.map((record) => [
        toText(record.referenceNumber),
        toText(record.name),
        toText(record.description ?? record.heading),
        formatDateTime(record.letterDate),
        formatDateTime(record.createdAt),
        `User ${toText(record.userId)}`,
      ]),
    );
  } else {
    const records = await listIncomingLetters(
      session,
      MAX_EXPORT_ROWS,
      period,
      context,
    );
    pdfInput = createPdfInput(
      entity,
      period,
      context,
      generatedAt,
      [
        { header: "Reference", weight: 0.9 },
        { header: "Sender", weight: 1.3 },
        { header: "Organization", weight: 1.5 },
        { header: "Subject", weight: 1.9 },
        { header: "Category", weight: 0.9, align: "center" },
        { header: "Received date", weight: 0.9 },
        { header: "Created by", weight: 0.8, align: "center" },
      ],
      records.map((record) => [
        toText(record.referenceNumber),
        toText(record.senderName),
        toText(record.senderOrganization),
        toText(record.subject),
        toText(record.category),
        formatDateTime(record.receivedDate),
        `User ${toText(record.userId)}`,
      ]),
    );
  }

  const pdfBytes = await buildReportPdfDocument(pdfInput);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildFileName(entity, period)}"`,
      "Cache-Control": "no-store",
    },
  });
}
