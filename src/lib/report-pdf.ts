import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  type PDFImage,
  type PDFFont,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type ReportTableColumn = {
  header: string;
  weight?: number;
  align?: "left" | "center" | "right";
};

export type ReportSummaryCard = {
  label: string;
  value: string;
};

export type ReportPdfInput = {
  title: string;
  subtitle: string;
  generatedAt: string;
  summaryCards: ReportSummaryCard[];
  columns: ReportTableColumn[];
  rows: string[][];
  footnote?: string;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN_X = 28;
const MARGIN_Y = 24;
const BANNER_HEIGHT = 92;
const CONTENT_GAP = 18;
const TABLE_HEADER_HEIGHT = 25;
const ROW_PADDING_Y = 7;
const ROW_PADDING_X = 8;
const BODY_FONT_SIZE = 8.4;
const HEADER_FONT_SIZE = 8.2;
const LINE_HEIGHT = 10.2;

const COLORS = {
  navy: rgb(0.1, 0.14, 0.24),
  navyLight: rgb(0.15, 0.2, 0.32),
  gold: rgb(0.86, 0.42, 0.1),
  goldLight: rgb(0.98, 0.82, 0.62),
  text: rgb(0.12, 0.13, 0.18),
  muted: rgb(0.43, 0.46, 0.54),
  line: rgb(0.85, 0.86, 0.88),
  panel: rgb(0.98, 0.98, 0.99),
  subtlePanel: rgb(0.96, 0.97, 0.99),
  white: rgb(1, 1, 1),
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = String(text ?? "").split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        currentLine = word;
        continue;
      }

      let partial = "";
      for (const character of word) {
        const candidateWord = `${partial}${character}`;
        if (font.widthOfTextAtSize(candidateWord, size) <= maxWidth) {
          partial = candidateWord;
        } else {
          if (partial) {
            lines.push(partial);
          }
          partial = character;
        }
      }

      currentLine = partial;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(
  page: PDFPage,
  options: {
    text: string;
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    color: ReturnType<typeof rgb>;
    align?: "left" | "center" | "right";
  },
) {
  const { text, x, y, width, font, size, color, align = "left" } = options;
  const lines = wrapText(text, font, size, width);

  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line || "-", size);
    let drawX = x;

    if (align === "center") {
      drawX = x + Math.max((width - lineWidth) / 2, 0);
    } else if (align === "right") {
      drawX = x + Math.max(width - lineWidth, 0);
    }

    page.drawText(line || "-", {
      x: drawX,
      y: y - index * LINE_HEIGHT,
      size,
      font,
      color,
    });
  });

  return lines.length;
}

function drawCard(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    accent: ReturnType<typeof rgb>;
    labelFont: PDFFont;
    valueFont: PDFFont;
  },
) {
  const { x, y, width, height, label, value, accent, labelFont, valueFont } = options;

  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: COLORS.panel,
    borderColor: COLORS.line,
    borderWidth: 0.8,
  });

  page.drawRectangle({
    x: x + 8,
    y: y - 12,
    width: 28,
    height: 3,
    color: accent,
    opacity: 0.95,
  });

  page.drawText(label.toUpperCase(), {
    x: x + 12,
    y: y - 24,
    size: 7.2,
    font: labelFont,
    color: COLORS.muted,
  });

  drawWrappedText(page, {
    text: value,
    x: x + 12,
    y: y - 43,
    width: width - 24,
    font: valueFont,
    size: 11.4,
    color: COLORS.text,
  });
}

function drawBanner(
  page: PDFPage,
  options: {
    title: string;
    subtitle: string;
    generatedAt: string;
    logoImage?: PDFImage | null;
    regularFont: PDFFont;
    boldFont: PDFFont;
  },
) {
  const { title, subtitle, generatedAt, logoImage, regularFont, boldFont } = options;

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - BANNER_HEIGHT,
    width: PAGE_WIDTH,
    height: BANNER_HEIGHT,
    color: COLORS.navy,
  });

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - BANNER_HEIGHT,
    width: PAGE_WIDTH,
    height: 6,
    color: COLORS.gold,
  });

  if (logoImage) {
    page.drawImage(logoImage, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 64,
      width: 40,
      height: 40,
    });
  }

  page.drawText("OWERU MANAGEMENT SYSTEM", {
    x: MARGIN_X + (logoImage ? 52 : 0),
    y: PAGE_HEIGHT - 32,
    size: 8.2,
    font: boldFont,
    color: COLORS.goldLight,
  });

  page.drawText(title, {
    x: MARGIN_X + (logoImage ? 52 : 0),
    y: PAGE_HEIGHT - 50,
    size: 20,
    font: boldFont,
    color: COLORS.white,
  });

  page.drawText(subtitle, {
    x: MARGIN_X + (logoImage ? 52 : 0),
    y: PAGE_HEIGHT - 68,
    size: 10,
    font: regularFont,
    color: rgb(0.92, 0.94, 0.98),
  });

  page.drawText(generatedAt, {
    x: PAGE_WIDTH - MARGIN_X - 170,
    y: PAGE_HEIGHT - 36,
    size: 8.8,
    font: regularFont,
    color: rgb(0.88, 0.91, 0.97),
  });
}

function drawTableHeader(
  page: PDFPage,
  options: {
    y: number;
    widths: number[];
    columns: ReportTableColumn[];
    boldFont: PDFFont;
  },
) {
  const { y, widths, columns, boldFont } = options;
  let cursorX = MARGIN_X;

  page.drawRectangle({
    x: MARGIN_X,
    y: y - TABLE_HEADER_HEIGHT,
    width: PAGE_WIDTH - MARGIN_X * 2,
    height: TABLE_HEADER_HEIGHT,
    color: COLORS.navyLight,
  });

  columns.forEach((column, index) => {
    const width = widths[index];
    page.drawText(column.header, {
      x: cursorX + ROW_PADDING_X,
      y: y - 16,
      size: HEADER_FONT_SIZE,
      font: boldFont,
      color: COLORS.white,
    });
    cursorX += width;
  });
}

function drawTableRow(
  page: PDFPage,
  options: {
    y: number;
    widths: number[];
    columns: ReportTableColumn[];
    values: string[];
    regularFont: PDFFont;
    boldFont: PDFFont;
    rowIndex: number;
  },
) {
  const { y, widths, columns, values, regularFont, boldFont, rowIndex } = options;
  const wrappedCells = values.map((value, index) => {
    const cellWidth = widths[index] - ROW_PADDING_X * 2;
    const font = columns[index]?.align === "right" ? boldFont : regularFont;
    return wrapText(value || "-", font, BODY_FONT_SIZE, Math.max(cellWidth, 32));
  });

  const maxLines = Math.max(...wrappedCells.map((lines) => lines.length), 1);
  const rowHeight = maxLines * LINE_HEIGHT + ROW_PADDING_Y * 2;
  const rowY = y - rowHeight;

  page.drawRectangle({
    x: MARGIN_X,
    y: rowY,
    width: PAGE_WIDTH - MARGIN_X * 2,
    height: rowHeight,
    color: rowIndex % 2 === 0 ? COLORS.white : COLORS.subtlePanel,
    borderColor: COLORS.line,
    borderWidth: 0.45,
  });

  let cursorX = MARGIN_X;
  wrappedCells.forEach((lines, index) => {
    const column = columns[index];
    const cellWidth = widths[index];
    const textX = cursorX + ROW_PADDING_X;
    const textY = y - ROW_PADDING_Y - BODY_FONT_SIZE;
    const align = column?.align ?? "left";

    lines.forEach((line, lineIndex) => {
      const drawY = textY - lineIndex * LINE_HEIGHT;
      const lineWidth = regularFont.widthOfTextAtSize(line || "-", BODY_FONT_SIZE);
      let drawX = textX;

      if (align === "center") {
        drawX = cursorX + Math.max((cellWidth - lineWidth) / 2, 0);
      } else if (align === "right") {
        drawX = cursorX + Math.max(cellWidth - lineWidth - ROW_PADDING_X, 0);
      }

      page.drawText(line || "-", {
        x: drawX,
        y: drawY,
        size: BODY_FONT_SIZE,
        font: regularFont,
        color: COLORS.text,
      });
    });

    cursorX += cellWidth;
  });

  return rowHeight;
}

function drawFooter(page: PDFPage, pageNumber: number, totalPages: number, boldFont: PDFFont, regularFont: PDFFont, footnote?: string) {
  page.drawLine({
    start: { x: MARGIN_X, y: MARGIN_Y + 14 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: MARGIN_Y + 14 },
    thickness: 0.6,
    color: COLORS.line,
  });

  page.drawText(`Page ${pageNumber} of ${totalPages}`, {
    x: MARGIN_X,
    y: MARGIN_Y,
    size: 8.2,
    font: boldFont,
    color: COLORS.muted,
  });

  page.drawText(footnote ?? "Generated by Oweru Management System", {
    x: PAGE_WIDTH - MARGIN_X - 290,
    y: MARGIN_Y,
    size: 8,
    font: regularFont,
    color: COLORS.muted,
  });
}

function buildColumnWidths(columns: ReportTableColumn[]) {
  const totalWeight = columns.reduce((sum, column) => sum + (column.weight ?? 1), 0);
  const availableWidth = PAGE_WIDTH - MARGIN_X * 2;
  return columns.map((column) => ((column.weight ?? 1) / totalWeight) * availableWidth);
}

async function loadLogoBytes() {
  try {
    return await readFile(path.join(process.cwd(), "public", "oweru.jpeg"));
  } catch {
    return null;
  }
}

export async function buildReportPdfDocument(input: ReportPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await loadLogoBytes();
  let logoImage: PDFImage | null = null;

  if (logoBytes) {
    try {
      logoImage =
        logoBytes[0] === 0xff && logoBytes[1] === 0xd8
          ? await pdfDoc.embedJpg(logoBytes)
          : await pdfDoc.embedPng(logoBytes);
    } catch {
      logoImage = null;
    }
  }
  const columnWidths = buildColumnWidths(input.columns);

  const tableStartFirstPage = PAGE_HEIGHT - BANNER_HEIGHT - CONTENT_GAP - 66;
  const tableStartFollowingPages = PAGE_HEIGHT - 48 - CONTENT_GAP - TABLE_HEADER_HEIGHT;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBanner(currentPage, {
    title: input.title,
    subtitle: input.subtitle,
    generatedAt: input.generatedAt,
    logoImage,
    regularFont,
    boldFont,
  });

  const cardCount = Math.min(input.summaryCards.length, 3);
  const cardWidth = (PAGE_WIDTH - MARGIN_X * 2 - 16 * (cardCount - 1)) / Math.max(cardCount, 1);
  const cardsTop = PAGE_HEIGHT - BANNER_HEIGHT - 18;

  input.summaryCards.slice(0, 3).forEach((card, index) => {
    drawCard(currentPage, {
      x: MARGIN_X + index * (cardWidth + 16),
      y: cardsTop,
      width: cardWidth,
      height: 62,
      label: card.label,
      value: card.value,
      accent: index === 0 ? COLORS.gold : index === 1 ? COLORS.navyLight : COLORS.goldLight,
      labelFont: boldFont,
      valueFont: boldFont,
    });
  });

  let cursorY = tableStartFirstPage;
  drawTableHeader(currentPage, {
    y: cursorY,
    widths: columnWidths,
    columns: input.columns,
    boldFont,
  });
  cursorY -= TABLE_HEADER_HEIGHT + 6;

  if (input.rows.length === 0) {
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: cursorY - 88,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: 88,
      color: COLORS.panel,
      borderColor: COLORS.line,
      borderWidth: 0.8,
    });

    currentPage.drawText("No records were found for the selected period.", {
      x: MARGIN_X + 16,
      y: cursorY - 48,
      size: 11,
      font: boldFont,
      color: COLORS.text,
    });
  }

  input.rows.forEach((row, rowIndex) => {
    const rowHeightEstimate = Math.max(
      ...row.map((value, columnIndex) => {
        const font = input.columns[columnIndex]?.align === "right" ? boldFont : regularFont;
        return wrapText(value || "-", font, BODY_FONT_SIZE, Math.max(columnWidths[columnIndex] - ROW_PADDING_X * 2, 32)).length;
      }),
      1,
    ) * LINE_HEIGHT + ROW_PADDING_Y * 2;

    if (cursorY - rowHeightEstimate < MARGIN_Y + 20) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawCompactHeader(currentPage, input, regularFont, boldFont);
      cursorY = tableStartFollowingPages;
      drawTableHeader(currentPage, {
        y: cursorY,
        widths: columnWidths,
        columns: input.columns,
        boldFont,
      });
      cursorY -= TABLE_HEADER_HEIGHT + 6;
    }

    const actualHeight = drawTableRow(currentPage, {
      y: cursorY,
      widths: columnWidths,
      columns: input.columns,
      values: row,
      regularFont,
      boldFont,
      rowIndex,
    });

    cursorY -= actualHeight + 0.8;
  });

  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    drawFooter(page, index + 1, pages.length, boldFont, regularFont, input.footnote);
  });

  return pdfDoc.save();
}

function drawCompactHeader(
  page: PDFPage,
  input: ReportPdfInput,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 48,
    width: PAGE_WIDTH,
    height: 48,
    color: COLORS.navy,
  });

  page.drawText(input.title, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 30,
    size: 13,
    font: boldFont,
    color: COLORS.white,
  });

  page.drawText(input.subtitle, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 42,
    size: 8.3,
    font: regularFont,
    color: rgb(0.9, 0.93, 0.97),
  });

  page.drawText(input.generatedAt, {
    x: PAGE_WIDTH - MARGIN_X - 178,
    y: PAGE_HEIGHT - 30,
    size: 8.2,
    font: regularFont,
    color: rgb(0.9, 0.93, 0.97),
  });
}