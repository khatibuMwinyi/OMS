import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { IncomingLetterRecord, LetterRecord } from "@/lib/records";
import { splitLetterBody } from "@/lib/records";

const templateBytesCache = new Map<string, Promise<Uint8Array>>();
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDisplayDate(value: string | Date | number | null | undefined) {
  if (value == null) {
    return "-";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "-" : dateFormatter.format(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "-";
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return dateFormatter.format(parsed);
    }

    return trimmed;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return dateFormatter.format(parsed);
  }

  return String(value);
}

function wrapTextByWidth(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
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

  return lines;
}

function loadTemplateBytes(templateFileName: string) {
  const cached = templateBytesCache.get(templateFileName);
  if (cached) {
    return cached;
  }

  const templatePath = path.join(
    process.cwd(),
    "public",
    "pdf-templates",
    templateFileName,
  );

  const promise = readFile(templatePath);
  templateBytesCache.set(templateFileName, promise);
  return promise;
}

async function createPdfDocument(templateFileName?: string) {
  const pdfDoc = await PDFDocument.create();

  if (templateFileName) {
    const templateBytes = await loadTemplateBytes(templateFileName);
    const templateDoc = await PDFDocument.load(templateBytes);
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    pdfDoc.addPage(templatePage);
  } else {
    pdfDoc.addPage([595, 842]);
  }

  return pdfDoc;
}

export async function buildFormalLetterPdf(
  document: Pick<
    LetterRecord,
    | "name"
    | "description"
    | "letterDate"
    | "receiverAddress"
    | "heading"
    | "body"
  >,
) {
  const pdfDoc = await createPdfDocument("LETTER H.pdf");
  const page = pdfDoc.getPages()[0];
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const dark = rgb(0.18, 0.22, 0.3);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const leftX = 66;
  const rightMargin = 66;
  const bodyWidth = 465;

  const dateText = formatDisplayDate(document.letterDate);
  const dateSize = 12.5;
  const dateWidth = boldFont.widthOfTextAtSize(dateText, dateSize);

  page.drawText(dateText.toUpperCase(), {
    x: pageWidth - rightMargin - dateWidth,
    y: pageHeight - 210,
    size: dateSize,
    font: boldFont,
    color: dark,
  });

  let cursorY = pageHeight - 258;
  const fontSize = 12;
  const lineSpacing = fontSize * 1.5;

  page.drawText("TO:", {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  cursorY -= lineSpacing;
  page.drawText(document.name, {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  const addressLines = (document.receiverAddress ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of addressLines) {
    cursorY -= lineSpacing;
    page.drawText(line, {
      x: leftX,
      y: cursorY,
      size: fontSize,
      font: regularFont,
      color: dark,
    });
  }

  cursorY -= lineSpacing * 1.5;
  page.drawText("Dear Sir/Madam.", {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  cursorY -= lineSpacing * 1.5;
  const subjectText = `RE: ${String(document.heading ?? document.description ?? "Official Letter").toUpperCase()}`;
  const subjectLines = wrapTextByWidth(
    subjectText,
    boldFont,
    fontSize,
    bodyWidth,
  );

  for (const line of subjectLines) {
    page.drawText(line, {
      x: leftX,
      y: cursorY,
      size: fontSize,
      font: boldFont,
      color: dark,
    });

    const lineWidth = boldFont.widthOfTextAtSize(line, fontSize);
    page.drawLine({
      start: { x: leftX, y: cursorY - 2 },
      end: { x: leftX + lineWidth, y: cursorY - 2 },
      thickness: 0.8,
      color: dark,
    });

    cursorY -= lineSpacing;
  }

  cursorY -= lineSpacing;
  const { customMessage, signature } = splitLetterBody(document.body);
  const messageParagraphs = customMessage
    ? customMessage
        .split(/\n\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  for (const paragraph of messageParagraphs) {
    const wrappedLines = wrapTextByWidth(
      paragraph,
      regularFont,
      fontSize,
      bodyWidth,
    );
    for (let i = 0; i < wrappedLines.length; i++) {
      const line = wrappedLines[i];
      const isLastLine = i === wrappedLines.length - 1;

      if (isLastLine) {
        page.drawText(line, {
          x: leftX,
          y: cursorY,
          size: fontSize,
          font: regularFont,
          color: dark,
        });
      } else {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          const totalWordsWidth = words.reduce(
            (acc, word) => acc + regularFont.widthOfTextAtSize(word, fontSize),
            0,
          );
          const totalSpaceWidth = bodyWidth - totalWordsWidth;
          const spaceWidth = totalSpaceWidth / (words.length - 1);

          let currentX = leftX;
          for (let j = 0; j < words.length; j++) {
            page.drawText(words[j], {
              x: currentX,
              y: cursorY,
              size: fontSize,
              font: regularFont,
              color: dark,
            });
            currentX +=
              regularFont.widthOfTextAtSize(words[j], fontSize) + spaceWidth;
          }
        } else {
          page.drawText(line, {
            x: leftX,
            y: cursorY,
            size: fontSize,
            font: regularFont,
            color: dark,
          });
        }
      }
      cursorY -= lineSpacing;
    }
    cursorY -= lineSpacing; // Paragraph spacing
  }

  if (
    signature &&
    !signature.toUpperCase().includes("DIRECTOR: OWERU INTERNATIONAL LTD")
  ) {
    const wrappedSignature = wrapTextByWidth(
      signature,
      regularFont,
      fontSize,
      bodyWidth,
    );
    for (const line of wrappedSignature) {
      page.drawText(line, {
        x: leftX,
        y: cursorY,
        size: fontSize,
        font: regularFont,
        color: dark,
      });
      cursorY -= lineSpacing;
    }
  }

  return pdfDoc.save();
}

export async function buildIncomingLetterPdf(
  document: Pick<
    IncomingLetterRecord,
    | "senderName"
    | "senderOrganization"
    | "subject"
    | "category"
    | "receivedDate"
    | "description"
  >,
) {
  const pdfDoc = await createPdfDocument();
  const page = pdfDoc.getPages()[0];
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const accent = rgb(0.72, 0.5, 0.22);
  const dark = rgb(0.16, 0.18, 0.24);
  const muted = rgb(0.38, 0.4, 0.46);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const leftX = 62;
  const contentWidth = pageWidth - leftX * 2;

  const title = "INCOMING LETTER RECORD";
  const titleSize = 19;
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);

  page.drawText("OWERU INTERNATIONAL LTD.", {
    x:
      (pageWidth - boldFont.widthOfTextAtSize("OWERU INTERNATIONAL LTD.", 16)) /
      2,
    y: pageHeight - 58,
    size: 16,
    font: boldFont,
    color: accent,
  });

  page.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: pageHeight - 82,
    size: titleSize,
    font: boldFont,
    color: dark,
  });

  page.drawLine({
    start: { x: leftX, y: pageHeight - 100 },
    end: { x: pageWidth - leftX, y: pageHeight - 100 },
    thickness: 0.8,
    color: accent,
  });

  page.drawText(`Date: ${formatDisplayDate(document.receivedDate)}`, {
    x: pageWidth - 182,
    y: pageHeight - 122,
    size: 11,
    font: regularFont,
    color: muted,
  });

  let cursorY = pageHeight - 154;
  page.drawText("FROM", {
    x: leftX,
    y: cursorY,
    size: 11.2,
    font: boldFont,
    color: accent,
  });

  cursorY -= 16;
  page.drawText(document.senderName, {
    x: leftX,
    y: cursorY,
    size: 13.2,
    font: boldFont,
    color: dark,
  });

  if (document.senderOrganization) {
    cursorY -= 16;
    page.drawText(document.senderOrganization, {
      x: leftX,
      y: cursorY,
      size: 11.4,
      font: regularFont,
      color: muted,
    });
  }

  cursorY -= 24;
  page.drawText("SUBJECT", {
    x: leftX,
    y: cursorY,
    size: 11.2,
    font: boldFont,
    color: accent,
  });

  cursorY -= 16;
  const subjectLines = wrapTextByWidth(
    document.subject || "Incoming Letter",
    boldFont,
    12.4,
    contentWidth,
  );
  for (const line of subjectLines) {
    page.drawText(line, {
      x: leftX,
      y: cursorY,
      size: 12.4,
      font: boldFont,
      color: dark,
    });
    cursorY -= 15;
  }

  cursorY -= 18;
  page.drawText("CATEGORY", {
    x: leftX,
    y: cursorY,
    size: 11.2,
    font: boldFont,
    color: accent,
  });
  cursorY -= 15;
  page.drawText(document.category, {
    x: leftX,
    y: cursorY,
    size: 11.8,
    font: regularFont,
    color: dark,
  });

  cursorY -= 24;
  page.drawText("DESCRIPTION", {
    x: leftX,
    y: cursorY,
    size: 11.2,
    font: boldFont,
    color: accent,
  });

  cursorY -= 16;
  const descriptionText =
    document.description?.trim() || "No description provided.";
  const descriptionLines = wrapTextByWidth(
    descriptionText,
    regularFont,
    11.5,
    contentWidth,
  );
  for (const line of descriptionLines) {
    if (cursorY < 90) {
      break;
    }

    page.drawText(line, {
      x: leftX,
      y: cursorY,
      size: 11.5,
      font: regularFont,
      color: dark,
    });
    cursorY -= 15.5;
  }

  cursorY -= 18;
  page.drawText("Recorded for official office use only.", {
    x: leftX,
    y: cursorY,
    size: 10.2,
    font: regularFont,
    color: muted,
  });

  return pdfDoc.save();
}
