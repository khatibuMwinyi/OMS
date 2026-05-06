import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
} from "@/lib/payment-defaults";
import type { ReceiptItemRecord, ReceiptRecord } from "@/lib/records";

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
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
}

function wrapTextByWidth(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
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
  const cacheKey = "receipt-template";
  const cached = templateBytesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = readFile(
    path.join(process.cwd(), "public", "pdf-templates", "RECEIPT.pdf"),
  );
  templateBytesCache.set(cacheKey, promise);
  return promise;
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
  labelSize = 15.5,
  valueSize = 11.5,
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

export async function buildReceiptPdf(document: ReceiptRecord, items: ReceiptItemRecord[] = []) {
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

  const receiptDate = formatDate(document.receiptDate);
  const rightLabelX = 424;

  // Header Left
  page.drawText("Oweru International LTD", {
    x: 58,
    y: pageHeight - 140,
    size: 16.5,
    font: boldFont,
    color: muted,
  });
  page.drawText(`Prepared for: ${document.customerName}`, {
    x: 58,
    y: pageHeight - 162,
    size: 14,
    font: boldFont,
    color: text,
  });

  // Header Right
  page.drawText(`#${document.receiptNumber}`, {
    x: rightLabelX,
    y: pageHeight - 104,
    size: 20,
    font: boldFont,
    color: rgb(0.86, 0.42, 0.1), // Stronger brown/gold ribbon accent
  });

  page.drawText(receiptDate.toUpperCase(), {
    x: rightLabelX,
    y: pageHeight - 124,
    size: 9.5,
    font: boldFont,
    color: text,
  });

  // Stacked Fields on the right (Align with Invoice and Voucher styles)
  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 140,
    "Payment Method",
    document.paymentMethod || "-",
    text,
    muted,
  );

  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 210,
    "Category",
    document.category || "-",
    text,
    muted,
  );

  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 280,
    "Phone Number",
    document.phone || "-",
    text,
    muted,
  );

  // Bank / Mobile Details on the right (below Phone Number)
  if (document.paymentMethod === "Bank Transfer" && (document.bankName || document.referenceNumber)) {
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 350,
      "Account name",
      FIXED_BANK_ACCOUNT_NAME,
      text,
      muted,
    );
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 420,
      "Account number",
      FIXED_BANK_ACCOUNT_NUMBER,
      text,
      muted,
    );
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 490,
      "Bank Reference",
      document.referenceNumber || "-",
      text,
      muted,
    );
  } else if (document.paymentMethod === "Bank Deposit") {
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 350,
      "Account name",
      FIXED_BANK_ACCOUNT_NAME,
      text,
      muted,
    );
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 420,
      "Account number",
      FIXED_BANK_ACCOUNT_NUMBER,
      text,
      muted,
    );
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 490,
      "Depositor",
      document.depositorName || "-",
      text,
      muted,
    );
  } else if (document.paymentMethod === "Mobile Money" && document.referenceNumber) {
    drawStackedField(
      page,
      { bold: boldFont, regular: regularFont },
      rightLabelX,
      pageHeight - 350,
      "Mobile Reference",
      document.referenceNumber || "-",
      text,
      muted,
    );
  }

  // Body Table Section
  const tableLeftX = 68;
  const tableRightMax = 560;
  const tableFullWidth = tableRightMax - tableLeftX;

  const descColX = tableLeftX;
  const qtyColX = tableLeftX + 290;
  const unitColX = tableLeftX + 360;
  const totalColX = tableLeftX + 440;
  const headerY = 530;

  // Header background
  page.drawRectangle({
    x: tableLeftX,
    y: headerY - 10,
    width: tableFullWidth,
    height: 25,
    color: rgb(0.96, 0.97, 1),
  });

  page.drawText("Description", {
    x: descColX + 5,
    y: headerY,
    size: 10,
    font: boldFont,
    color: text,
  });
  page.drawText("Qty", {
    x: qtyColX,
    y: headerY,
    size: 10,
    font: boldFont,
    color: text,
  });
  page.drawText("Unit Price", {
    x: unitColX,
    y: headerY,
    size: 10,
    font: boldFont,
    color: text,
  });
  page.drawText("Total", {
    x: totalColX,
    y: headerY,
    size: 10,
    font: boldFont,
    color: text,
  });

  // Render rows — fall back to document fields if no items (legacy receipts)
  const renderItems =
    items.length > 0
      ? items
      : [
          {
            description: document.description || "Payment for services",
            category: document.category || null,
            location: null,
            quantity: 1,
            unitPrice: Number(document.amount),
            total: Number(document.amount),
          },
        ];

  let rowY = headerY - 35;
  const rowGap = 30;

  for (let i = 0; i < renderItems.length; i++) {
    const item = renderItems[i];
    const itemTotal = item.quantity * item.unitPrice;

    if (i % 2 === 0) {
      page.drawRectangle({
        x: tableLeftX,
        y: rowY - 10,
        width: tableFullWidth,
        height: rowGap,
        color: rgb(0.98, 0.99, 1),
      });
    }

    const descText =
      item.category
        ? `${item.description} (${item.category})`
        : item.description;
    const descLines = wrapTextByWidth(descText, regularFont, 10, 270);

    descLines.forEach((line, li) => {
      page.drawText(line, {
        x: descColX + 5,
        y: rowY - li * 13,
        size: 10,
        font: regularFont,
        color: text,
      });
    });

    page.drawText(String(item.quantity), {
      x: qtyColX,
      y: rowY,
      size: 10,
      font: regularFont,
      color: text,
    });
    page.drawText(formatAmount(item.unitPrice), {
      x: unitColX,
      y: rowY,
      size: 10,
      font: regularFont,
      color: text,
    });
    page.drawText(formatAmount(itemTotal), {
      x: totalColX,
      y: rowY,
      size: 10,
      font: boldFont,
      color: text,
    });

    rowY -= Math.max(rowGap, descLines.length * 13 + 8);
  }

  const dividerY = rowY + 14;
  page.drawLine({
    start: { x: tableLeftX, y: dividerY },
    end: { x: tableLeftX + tableFullWidth, y: dividerY },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.95),
  });

  const grandTotal = renderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const summaryLabelX = totalColX - 80;
  let summaryY = rowY - 18;

  page.drawText("Subtotal", {
    x: summaryLabelX,
    y: summaryY,
    size: 10,
    font: regularFont,
    color: muted,
  });
  page.drawText(formatAmount(grandTotal), {
    x: totalColX,
    y: summaryY,
    size: 10,
    font: regularFont,
    color: text,
  });

  summaryY -= 30;

  const totalBoxWidth = 180;
  const totalBoxX = tableRightMax - totalBoxWidth;

  page.drawRectangle({
    x: totalBoxX,
    y: summaryY - 8,
    width: totalBoxWidth,
    height: 28,
    color: rgb(0.1, 0.12, 0.18),
  });

  page.drawText("Total Paid", {
    x: totalBoxX + 8,
    y: summaryY + 4,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  const totalStr = formatCurrency(grandTotal);
  const totalValueWidth = boldFont.widthOfTextAtSize(totalStr, 10.5);
  page.drawText(totalStr, {
    x: tableRightMax - totalValueWidth - 8,
    y: summaryY + 4,
    size: 10.5,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  return await pdfDoc.save();
}
