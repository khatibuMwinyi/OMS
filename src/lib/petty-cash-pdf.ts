import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { PettyCashRecord } from "@/lib/records";

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

  return lines.length ? lines : ["-"];
}

function loadTemplateBytes() {
  const cacheKey = "voucher-template"; 
  const cached = templateBytesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = readFile(
    path.join(process.cwd(), "public", "pdf-templates", "VOUCHER.pdf"),
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

export async function buildPettyCashPdf(document: PettyCashRecord) {
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
  const tableLeftX = 68;
  const rightLabelX = 424;

  // Header Left Area
  page.drawText("Oweru International LTD", {
    x: 58,
    y: pageHeight - 140,
    size: 16.5,
    font: boldFont,
    color: muted,
  });
  page.drawText(`Petty Cash Voucher: ${document.type || "Expense"}`, {
    x: 58,
    y: pageHeight - 162,
    size: 14,
    font: boldFont,
    color: text,
  });

  // Top Right Info
  page.drawText(`#PCV${document.pettycashNumber || document.id}`, {
    x: rightLabelX,
    y: pageHeight - 74,
    size: 20,
    font: boldFont,
    color: rgb(0.72, 0.5, 0.22),
  });

  page.drawText(formatDate(document.date).toUpperCase(), {
    x: rightLabelX,
    y: pageHeight - 92,
    size: 9.5,
    font: boldFont,
    color: text,
  });

  // Stacked Fields on the right
  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 140,
    "Requested By",
    "Department Staff", 
    text,
    muted,
  );

  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 210,
    "Reference",
    document.referenceNumber || "-",
    text,
    muted,
  );

  drawStackedField(
    page,
    { bold: boldFont, regular: regularFont },
    rightLabelX,
    pageHeight - 280,
    "Category",
    document.category || "-",
    text,
    muted,
  );

  // Main Table Section
  const tableRightMax = 380;
  const tableFullWidth = tableRightMax - tableLeftX;
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

  page.drawText("Expense description", {
    x: tableLeftX + 5,
    y: headerY,
    size: 11.5,
    font: boldFont,
    color: text,
  });

  const headerTotalWidth = boldFont.widthOfTextAtSize("Total", 11.5);
  page.drawText("Total", {
    x: totalX + (25 - headerTotalWidth / 2),
    y: headerY,
    size: 11.5,
    font: boldFont,
    color: text,
  });

  let rowY = headerY - 35;
  const rowGap = 35;

  // Items Row
  page.drawRectangle({
    x: tableLeftX,
    y: rowY - 12,
    width: tableFullWidth,
    height: rowGap,
    color: rgb(0.98, 0.99, 1),
  });

  const descriptionLines = wrapTextByWidth(document.description || "-", regularFont, 11, 260);
  descriptionLines.forEach((line, i) => {
    page.drawText(line, {
      x: tableLeftX + 5,
      y: rowY - i * 14,
      size: 11,
      font: regularFont,
      color: text,
    });
  });

  const amountStr = formatAmount(Number(document.amount));
  const amountWidth = boldFont.widthOfTextAtSize(amountStr, 11);
  page.drawText(amountStr, {
    x: totalX + (25 - amountWidth / 2),
    y: rowY,
    size: 11,
    font: boldFont,
    color: text,
  });

  rowY -= Math.max(rowGap, descriptionLines.length * 14 + 10);

  // Summary and Total Due
  const summaryY = Math.max(rowY - 20, 180);
  const totalBoxWidth = 165;
  const totalBoxX = tableRightMax - totalBoxWidth;

  page.drawRectangle({
    x: totalBoxX,
    y: summaryY - 8,
    width: totalBoxWidth,
    height: 30,
    color: rgb(0.1, 0.12, 0.18),
  });

  page.drawText("Total", {
    x: totalBoxX + 8,
    y: summaryY + 5,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  const totalStr = formatCurrency(Number(document.amount));
  const totalValWidth = boldFont.widthOfTextAtSize(totalStr, 11);
  page.drawText(totalStr, {
    x: tableRightMax - totalValWidth - 8,
    y: summaryY + 5,
    size: 11,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  return pdfDoc.save();
}
