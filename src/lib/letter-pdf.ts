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

function resolveSignatureFilePath(signaturePath: string) {
  const normalizedPath = signaturePath.trim().replace(/^\/+/, "");
  return path.join(process.cwd(), "public", normalizedPath);
}

function getSignaturePathCandidates(
  signaturePaths: Array<string | null | undefined>,
) {
  const candidates: string[] = [];

  for (const signaturePath of signaturePaths) {
    const normalizedPath = signaturePath?.trim() ?? "";
    if (!normalizedPath) {
      continue;
    }

    candidates.push(normalizedPath);

    const extension = path.extname(normalizedPath).toLowerCase();
    if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
      const basePath = normalizedPath.slice(0, -extension.length);
      candidates.push(`${basePath}.png`);
      candidates.push(`${basePath}.jpg`);
      candidates.push(`${basePath}.jpeg`);
      continue;
    }

    if (!extension) {
      candidates.push(`${normalizedPath}.png`);
      candidates.push(`${normalizedPath}.jpg`);
      candidates.push(`${normalizedPath}.jpeg`);
    }
  }

  return Array.from(new Set(candidates));
}

async function embedSignatureImage(pdfDoc: PDFDocument, signaturePath: string) {
  const signatureBytes = await readFile(resolveSignatureFilePath(signaturePath));
  const lowerPath = signaturePath.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return pdfDoc.embedPng(signatureBytes);
  }

  return pdfDoc.embedJpg(signatureBytes);
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
    | "referenceNumber"
    | "description"
    | "letterDate"
    | "receiverAddress"
    | "heading"
    | "body"
    | "status"
    | "approvedSignaturePath"
    | "language"
  >,
  opts: { includeSignature?: boolean } = {},
) {
  const isSwahili = document.language === "sw";
  const recipientLabel = isSwahili ? "KWA:" : "TO:";
  const greeting = isSwahili ? "Ndugu." : "Dear Sir/Madam.";
  const subjectPrefix = isSwahili ? "KUH:" : "RE:";

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const dark = rgb(0.18, 0.22, 0.3);

  const fontSize = 12;
  const lineSpacing = fontSize * 1.5;
  const leftX = 66;
  const rightMargin = 66;
  const bodyWidth = 465;

  const SIGNATURE_FOOTER_TOP = 200;
  const PAGE1_NO_SIG_BOTTOM = 80;
  const CONTINUATION_TOP_OFFSET = 200;

  const addressLines = (document.receiverAddress ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const subjectText = `${subjectPrefix} ${String(document.heading ?? document.description ?? "Official Letter").toUpperCase()}`;
  const subjectLines = wrapTextByWidth(
    subjectText,
    boldFont,
    fontSize,
    bodyWidth,
  );

  const { customMessage } = splitLetterBody(document.body);
  const messageParagraphs = customMessage
    ? customMessage
        .split(/\n\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  type BodyLine = { text: string; justified: boolean; isSpacer: boolean };
  const bodyLines: BodyLine[] = [];
  for (const paragraph of messageParagraphs) {
    const wrappedLines = wrapTextByWidth(
      paragraph,
      regularFont,
      fontSize,
      bodyWidth,
    );
    for (let i = 0; i < wrappedLines.length; i++) {
      bodyLines.push({
        text: wrappedLines[i],
        justified: i < wrappedLines.length - 1,
        isSpacer: false,
      });
    }
    bodyLines.push({ text: "", justified: false, isSpacer: true });
  }
  if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].isSpacer) {
    bodyLines.pop();
  }

  const letterHTemplateBytes = await loadTemplateBytes("LETTER H.pdf");
  const letterHTemplateDoc = await PDFDocument.load(letterHTemplateBytes);
  const referencePage = letterHTemplateDoc.getPages()[0];
  const pageWidth = referencePage.getWidth();
  const pageHeight = referencePage.getHeight();

  const headerStartY = pageHeight - 258;
  const bodyFirstY =
    headerStartY -
    lineSpacing * (5 + addressLines.length + subjectLines.length);

  const lastBodyLineY =
    bodyLines.length === 0
      ? bodyFirstY
      : bodyFirstY - (bodyLines.length - 1) * lineSpacing;
  const fitsSinglePage = lastBodyLineY >= SIGNATURE_FOOTER_TOP;

  const page1TemplateName = fitsSinglePage
    ? "LETTER H.pdf"
    : "LETTER_TEMPLATE_1.pdf";
  const page1TemplateBytes = await loadTemplateBytes(page1TemplateName);
  const page1TemplateDoc = await PDFDocument.load(page1TemplateBytes);
  const [page1] = await pdfDoc.copyPages(page1TemplateDoc, [0]);
  pdfDoc.addPage(page1);

  const dateText = formatDisplayDate(document.letterDate);
  const referenceText = `REF: ${document.referenceNumber?.trim() || "-"}`;
  const referenceSize = 10.5;
  const referenceWidth = boldFont.widthOfTextAtSize(
    referenceText,
    referenceSize,
  );
  page1.drawText(referenceText.toUpperCase(), {
    x: pageWidth - rightMargin - referenceWidth,
    y: pageHeight - 192,
    size: referenceSize,
    font: boldFont,
    color: dark,
  });

  const dateSize = 12.5;
  const dateWidth = boldFont.widthOfTextAtSize(dateText, dateSize);
  page1.drawText(dateText.toUpperCase(), {
    x: pageWidth - rightMargin - dateWidth,
    y: pageHeight - 210,
    size: dateSize,
    font: boldFont,
    color: dark,
  });

  let cursorY = headerStartY;
  page1.drawText(recipientLabel, {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  cursorY -= lineSpacing;
  page1.drawText(document.name, {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  for (const line of addressLines) {
    cursorY -= lineSpacing;
    page1.drawText(line, {
      x: leftX,
      y: cursorY,
      size: fontSize,
      font: regularFont,
      color: dark,
    });
  }

  cursorY -= lineSpacing * 1.5;
  page1.drawText(greeting, {
    x: leftX,
    y: cursorY,
    size: fontSize,
    font: regularFont,
    color: dark,
  });

  cursorY -= lineSpacing * 1.5;
  for (const line of subjectLines) {
    page1.drawText(line, {
      x: leftX,
      y: cursorY,
      size: fontSize,
      font: boldFont,
      color: dark,
    });
    const lineWidth = boldFont.widthOfTextAtSize(line, fontSize);
    page1.drawLine({
      start: { x: leftX, y: cursorY - 2 },
      end: { x: leftX + lineWidth, y: cursorY - 2 },
      thickness: 0.8,
      color: dark,
    });
    cursorY -= lineSpacing;
  }

  cursorY -= lineSpacing;

  type LetterPage = ReturnType<typeof pdfDoc.addPage>;
  const drawBodyLine = (page: LetterPage, line: BodyLine, y: number) => {
    if (line.isSpacer || !line.text) {
      return;
    }
    if (line.justified) {
      const words = line.text.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const totalWordsWidth = words.reduce(
          (acc, word) => acc + regularFont.widthOfTextAtSize(word, fontSize),
          0,
        );
        const spaceWidth = (bodyWidth - totalWordsWidth) / (words.length - 1);
        let currentX = leftX;
        for (const word of words) {
          page.drawText(word, {
            x: currentX,
            y,
            size: fontSize,
            font: regularFont,
            color: dark,
          });
          currentX +=
            regularFont.widthOfTextAtSize(word, fontSize) + spaceWidth;
        }
        return;
      }
    }
    page.drawText(line.text, {
      x: leftX,
      y,
      size: fontSize,
      font: regularFont,
      color: dark,
    });
  };

  let currentPage: LetterPage = page1;
  let currentLimitY = fitsSinglePage
    ? SIGNATURE_FOOTER_TOP
    : PAGE1_NO_SIG_BOTTOM;
  let switchedToPage2 = false;

  for (const line of bodyLines) {
    if (!fitsSinglePage && !switchedToPage2 && cursorY < currentLimitY) {
      const page2TemplateBytes = await loadTemplateBytes("LETTER H.pdf");
      const page2TemplateDoc = await PDFDocument.load(page2TemplateBytes);
      const [page2] = await pdfDoc.copyPages(page2TemplateDoc, [0]);
      pdfDoc.addPage(page2);
      currentPage = page2;
      cursorY = pageHeight - CONTINUATION_TOP_OFFSET;
      currentLimitY = SIGNATURE_FOOTER_TOP;
      switchedToPage2 = true;
    }
    drawBodyLine(currentPage, line, cursorY);
    cursorY -= lineSpacing;
  }

  if (document.status === "approved" && opts.includeSignature) {
    const boundingX = leftX - 10;
    const boundingY = 120;
    const boxWidth = 145;
    const boxHeight = 55;

    const uniqueSignatureCandidates = getSignaturePathCandidates([
      document.approvedSignaturePath,
      process.env.ADMIN_SIGNATURE_IMAGE_PATH,
    ]);

    for (const signaturePath of uniqueSignatureCandidates) {
      try {
        const signatureImage = await embedSignatureImage(pdfDoc, signaturePath);
        const dims = signatureImage.scaleToFit(boxWidth, boxHeight);
        currentPage.drawImage(signatureImage, {
          x: boundingX + (boxWidth - dims.width) / 2,
          y: boundingY + (boxHeight - dims.height) / 2,
          width: dims.width,
          height: dims.height,
        });
        break;
      } catch {
        // Try next candidate path.
      }
    }
  }

  return pdfDoc.save();
}

export async function buildIncomingLetterPdf(
  document: Pick<
    IncomingLetterRecord,
    | "referenceNumber"
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
  const accent = rgb(0.86, 0.42, 0.1);
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

  page.drawText(`Reference: ${document.referenceNumber?.trim() || "-"}`, {
    x: pageWidth - 182,
    y: pageHeight - 138,
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
