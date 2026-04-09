import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
  FIXED_MOBILE_HOLDER_NAME,
  FIXED_MOBILE_NUMBER,
  FIXED_MOBILE_OPERATOR,
} from "@/lib/payment-defaults";
import type { InvoiceItemRecord, InvoiceRecord } from "@/lib/records";

const templateBytesCache = new Map<string, Promise<Uint8Array>>();

function formatCurrency(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date | number | null | undefined) {
  if (value == null) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" })
    .format(date)
    .toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
}

function addDays(
  value: string | Date | number | null | undefined,
  days: number,
) {
  const date = value instanceof Date ? new Date(value) : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + days);
  return date;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function wrapTextByWidth(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const words = String(text ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

function loadTemplateBytes() {
  const cacheKey = "invoice-template";
  const cached = templateBytesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = readFile(
    path.join(process.cwd(), "public", "pdf-templates", "INVOICE.pdf"),
  );
  templateBytesCache.set(cacheKey, promise);
  return promise;
}

function drawField(
  page: Awaited<ReturnType<PDFDocument["getPages"]>>[number],
  fonts: {
    bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  },
  labelX: number,
  valueX: number,
  y: number,
  label: string,
  value: string,
  labelColor: ReturnType<typeof rgb>,
  valueColor: ReturnType<typeof rgb>,
  labelSize = 11.5,
  valueSize = 10.5,
) {
  page.drawText(label, {
    x: labelX,
    y,
    size: labelSize,
    font: fonts.bold,
    color: labelColor,
  });
  page.drawText(value || "-", {
    x: valueX,
    y,
    size: valueSize,
    font: fonts.regular,
    color: valueColor,
  });
}

function drawStackedField(
  page: Awaited<ReturnType<PDFDocument["getPages"]>>[number],
  fonts: {
    bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  },
  x: number,
  y: number,
  label: string,
  value: string,
  labelColor: ReturnType<typeof rgb>,
  valueColor: ReturnType<typeof rgb>,
  labelSize = 15,
  valueSize = 11,
) {
  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: labelColor,
  });
  page.drawText(value || "-", {
    x,
    y: y - 22,
    size: valueSize,
    font: fonts.regular,
    color: valueColor,
  });
}

export async function buildInvoicePdf(
  document: NonNullable<
    Awaited<
      ReturnType<
        () => Promise<{
          invoice: InvoiceRecord;
          items: InvoiceItemRecord[];
        } | null>
      >
    >
  >,
) {
  const pdfDoc = await PDFDocument.create();
  const templateBytes = await loadTemplateBytes();
  const templateDoc = await PDFDocument.load(templateBytes);
  const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
  pdfDoc.addPage(templatePage);

  const page = pdfDoc.getPages()[0];
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const text = rgb(0.1, 0.12, 0.18);
  const muted = rgb(0.28, 0.31, 0.36);
  const pageHeight = page.getHeight();

  const invoiceDate = formatDate(document.invoice.invoiceDate);
  const dueDateValue = addDays(document.invoice.invoiceDate, 30);
  const dueDate = dueDateValue ? formatDate(dueDateValue) : "-";
  const paymentMethod = document.invoice.paymentMethod ?? "Cash";
  const bankName = FIXED_BANK_NAME;
  const bankAccountNumber = FIXED_BANK_ACCOUNT_NUMBER;
  const bankAccountName = FIXED_BANK_ACCOUNT_NAME;
  const mobileOperator = FIXED_MOBILE_OPERATOR;
  const mobileNumber = FIXED_MOBILE_NUMBER;
  const mobileHolderName = FIXED_MOBILE_HOLDER_NAME;
  const paymentHeading =
    paymentMethod === "Bank Transfer"
      ? bankName
      : paymentMethod === "Mobile Money"
        ? mobileOperator
        : "Cash";
  const accountName =
    paymentMethod === "Mobile Money"
      ? mobileHolderName
      : paymentMethod === "Bank Transfer"
        ? bankAccountName
        : "-";
  const accountNumber =
    paymentMethod === "Mobile Money"
      ? mobileNumber
      : paymentMethod === "Bank Transfer"
        ? bankAccountNumber
        : "-";

  const rightLabelX = 424;

  page.drawText("Oweru International LTD", {
    x: 58,
    y: pageHeight - 140,
    size: 16.5,
    font: boldFont,
    color: muted,
  });
  page.drawText(`Prepared for: ${document.invoice.customerName}`, {
    x: 58,
    y: pageHeight - 162,
    size: 14,
    font: boldFont,
    color: text,
  });

  page.drawText(`#${document.invoice.invoiceNumber || document.invoice.id}`, {
    x: rightLabelX,
    y: pageHeight - 104,
    size: 20,
    font: boldFont,
    color: rgb(0.86, 0.42, 0.1), // Stronger brown/gold ribbon accent
  });

  page.drawText(invoiceDate.toUpperCase(), {
    x: rightLabelX,
    y: pageHeight - 124,
    size: 9.5,
    font: boldFont,
    color: text,
  });

  page.drawText("Payment Details", {
    x: rightLabelX,
    y: pageHeight - 202,
    size: 15,
    font: boldFont,
    color: text,
  });
  page.drawText(`${paymentMethod} · ${paymentHeading}`, {
    x: rightLabelX,
    y: pageHeight - 224,
    size: 11,
    font: regularFont,
    color: muted,
  });
  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 276,
    "Account name",
    accountName,
    text,
    muted,
    15.5,
    11.5,
  );
  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 330,
    "Account number",
    accountNumber,
    text,
    muted,
    15.5,
    11.5,
  );
  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 384,
    "Due Date",
    dueDate,
    text,
    muted,
    15.5,
    11.5,
  );

  // Shift everything slightly right to align with the "INVOICE" header in the template
  const tableLeftX = 68;
  const tableRightMax = 380; // Boundary limit to avoid hitting the right container
  const tableFullWidth = tableRightMax - tableLeftX;

  const itemX = tableLeftX;
  const quantityX = tableLeftX + 160;
  const unitPriceX = tableLeftX + 205;
  const totalX = tableLeftX + 280;
  const headerY = 550;

  // Header Background
  page.drawRectangle({
    x: tableLeftX,
    y: headerY - 10,
    width: tableFullWidth,
    height: 25,
    color: rgb(0.96, 0.97, 1),
  });

  page.drawText("Item description", {
    x: itemX + 5,
    y: headerY,
    size: 11.5, // Further increased text size
    font: boldFont,
    color: text,
  });
  page.drawText("Qty", {
    x: quantityX,
    y: headerY,
    size: 11.5, // Further increased text size
    font: boldFont,
    color: text,
  });
  page.drawText("Unit Price", {
    // Changed from U. Price
    x: unitPriceX - 5, // Minor adjustment for the longer label
    y: headerY,
    size: 11.5, // Further increased text size
    font: boldFont,
    color: text,
  });
  const headerTotalWidth = boldFont.widthOfTextAtSize("Total", 11.5);
  page.drawText("Total", {
    x: totalX + (25 - headerTotalWidth / 2), // Centering "Total" roughly in its column
    y: headerY,
    size: 11.5, // Further increased text size
    font: boldFont,
    color: text,
  });

  let rowY = headerY - 35;
  const rowGap = 35;
  document.items.forEach((item, index) => {
    // Zebra striping
    if (index % 2 === 1) {
      page.drawRectangle({
        x: tableLeftX,
        y: rowY - 12,
        width: tableFullWidth,
        height: rowGap,
        color: rgb(0.98, 0.99, 1),
      });
    }

    const descriptionLines = wrapTextByWidth(
      item.description,
      regularFont,
      11,
      150,
    );
    descriptionLines.forEach((line, i) => {
      page.drawText(line, {
        x: itemX + 5,
        y: rowY - i * 14,
        size: 11, // Increased from 10.5
        font: regularFont,
        color: text,
      });
    });

    page.drawText(String(item.quantity), {
      x: quantityX + 5,
      y: rowY,
      size: 11, // Increased from 10.5
      font: regularFont,
      color: text,
    });
    page.drawText(formatAmount(Number(item.unitPrice)), {
      x: unitPriceX,
      y: rowY,
      size: 11, // Increased from 10.5
      font: regularFont,
      color: text,
    });
    const itemTotalStr = formatAmount(Number(item.total));
    const itemTotalWidth = boldFont.widthOfTextAtSize(itemTotalStr, 11);
    page.drawText(itemTotalStr, {
      x: totalX + (25 - itemTotalWidth / 2), // Center the total value in the column
      y: rowY,
      size: 11, // Increased from 10.5
      font: boldFont,
      color: text,
    });

    rowY -= Math.max(rowGap, descriptionLines.length * 14 + 10);
  });

  const dividerY = rowY + 15;
  page.drawLine({
    start: { x: tableLeftX, y: dividerY },
    end: { x: tableLeftX + tableFullWidth, y: dividerY },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.95),
  });

  const subtotal = Number(document.invoice.subtotal ?? 0);
  const taxAmount = Number(document.invoice.vat ?? 0);
  const discount = Number(document.invoice.discount ?? 0);
  const grandTotal = Number(
    document.invoice.grandTotal ?? subtotal + taxAmount - discount,
  );
  const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

  const summaryLabelX = tableLeftX + 200;
  const summaryValueOpenX = tableLeftX + 280;
  const summaryLabelSize = 11;
  const summaryValueSize = 11.5;
  let summaryY = rowY - 20;

  // Modern clean labels and values
  page.drawText("Subtotal", {
    x: summaryLabelX,
    y: summaryY,
    size: summaryLabelSize,
    font: regularFont,
    color: muted,
  });
  page.drawText(formatAmount(subtotal), {
    x: summaryValueOpenX,
    y: summaryY,
    size: summaryValueSize,
    font: regularFont,
    color: text,
  });

  summaryY -= 20;
  page.drawText(`Tax (${formatPercentage(taxRate)})`, {
    x: summaryLabelX,
    y: summaryY,
    size: summaryLabelSize,
    font: regularFont,
    color: muted,
  });
  page.drawText(formatAmount(taxAmount), {
    x: summaryValueOpenX,
    y: summaryY,
    size: summaryValueSize,
    font: regularFont,
    color: text,
  });

  if (discount > 0) {
    summaryY -= 20;
    page.drawText("Discount", {
      x: summaryLabelX,
      y: summaryY,
      size: summaryLabelSize,
      font: regularFont,
      color: muted,
    });
    page.drawText(`- ${formatAmount(discount)}`, {
      x: summaryValueOpenX,
      y: summaryY,
      size: summaryValueSize,
      font: regularFont,
      color: rgb(0.8, 0, 0),
    });
  }

  summaryY -= 35;
  // Total Highlight within white section
  const totalBoxWidth = 165; // Slightly wider for better spacing
  const totalBoxX = 412 - totalBoxWidth; // Pushed to the far right of the white section

  page.drawRectangle({
    x: totalBoxX,
    y: summaryY - 8,
    width: totalBoxWidth,
    height: 30,
    color: rgb(0.1, 0.12, 0.18), // Dark Navy Background like example
  });

  page.drawText("Total Due", {
    x: totalBoxX + 8,
    y: summaryY + 5,
    size: 10.5,
    font: boldFont,
    color: rgb(1, 1, 1), // White text
  });

  const totalStr = formatCurrency(grandTotal);
  const totalValueWidth = boldFont.widthOfTextAtSize(totalStr, 11.5);
  page.drawText(totalStr, {
    x: totalBoxX + totalBoxWidth - totalValueWidth - 8,
    y: summaryY + 5,
    size: 11.5,
    font: boldFont,
    color: rgb(1, 1, 1), // White text
  });

  return pdfDoc.save();
}
