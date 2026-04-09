import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

import {
  getInvoiceDocument,
  getInvoiceDocumentPublic,
  getLetterDocument,
  getLetterDocumentPublic,
  getIncomingLetterDocument,
  getPettyCashDocument,
  getReceiptDocument,
  getReceiptDocumentPublic,
  getVoucherDocument,
} from "@/lib/records";
import { verifyPublicShareToken } from "@/lib/public-share";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { buildFormalLetterPdf } from "@/lib/letter-pdf";
import { buildPettyCashPdf } from "@/lib/petty-cash-pdf";
import { buildVoucherPdf } from "@/lib/voucher-pdf";
import { getCurrentSession } from "@/lib/session-server";

type RouteParams = {
  params: Promise<{ type: string; id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toAttachmentName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  const baseName = trimmed.replace(/\.[^.]+$/, "");
  const sanitized = sanitizeFilename(baseName);
  return sanitized ? `${sanitized}.pdf` : fallback;
}

function formatDisplayDate(value: unknown) {
  if (value instanceof Date) {
    return dateFormatter.format(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return dateFormatter.format(parsed);
    }

    return value;
  }

  return "-";
}

function wrapTextToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
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
      for (const char of word) {
        const nextPartial = `${partial}${char}`;
        if (font.widthOfTextAtSize(nextPartial, size) <= maxWidth) {
          partial = nextPartial;
        } else {
          if (partial) {
            lines.push(partial);
          }
          partial = char;
        }
      }

      currentLine = partial;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length ? lines : [""];
}

async function loadTemplatePage(templateFileName: string) {
  const pdfDoc = await PDFDocument.create();
  const templateBytes = await readFile(
    path.join(process.cwd(), "public", "pdf-templates", templateFileName),
  );
  const templateDoc = await PDFDocument.load(templateBytes);
  const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
  pdfDoc.addPage(templatePage);

  return {
    pdfDoc,
    page: pdfDoc.getPages()[0],
  };
}

function drawSectionHeading(
  page: PDFPage,
  title: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
) {
  const accent = rgb(0.86, 0.42, 0.1);

  page.drawText(title, {
    x,
    y,
    size: 11.2,
    font,
    color: accent,
  });

  page.drawLine({
    start: { x, y: y - 5 },
    end: { x: x + width, y: y - 5 },
    thickness: 0.6,
    color: rgb(0.72, 0.67, 0.6),
  });

  return y - 18;
}

function drawFieldLine(
  page: PDFPage,
  options: {
    label: string;
    value: string | null | undefined;
    x: number;
    y: number;
    labelWidth: number;
    valueWidth: number;
    labelFont: PDFFont;
    valueFont: PDFFont;
    labelSize?: number;
    valueSize?: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
    gapAfter?: number;
  },
) {
  const {
    label,
    value,
    x,
    y,
    labelWidth,
    valueWidth,
    labelFont,
    valueFont,
    labelSize = 10.5,
    valueSize = 10.5,
    color = rgb(0.12, 0.13, 0.18),
    lineHeight = 14,
    gapAfter = 6,
  } = options;

  page.drawText(`${label}:`, {
    x,
    y,
    size: labelSize,
    font: labelFont,
    color,
  });

  const wrappedValue = wrapTextToWidth(
    value ?? "-",
    valueFont,
    valueSize,
    valueWidth,
  );

  wrappedValue.forEach((line, index) => {
    page.drawText(line || "-", {
      x: x + labelWidth,
      y: y - index * lineHeight,
      size: valueSize,
      font: valueFont,
      color,
    });
  });

  return y - Math.max(wrappedValue.length, 1) * lineHeight - gapAfter;
}

function drawStackedField(
  page: PDFPage,
  options: {
    label: string;
    value: string | null | undefined;
    x: number;
    y: number;
    labelFont: PDFFont;
    valueFont: PDFFont;
    labelColor: ReturnType<typeof rgb>;
    valueColor: ReturnType<typeof rgb>;
    labelSize?: number;
    valueSize?: number;
  },
) {
  const {
    label,
    value,
    x,
    y,
    labelFont,
    valueFont,
    labelColor,
    valueColor,
    labelSize = 15,
    valueSize = 11,
  } = options;

  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: labelFont,
    color: labelColor,
  });

  page.drawText(value || "-", {
    x,
    y: y - 16,
    size: valueSize,
    font: valueFont,
    color: valueColor,
  });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestUrl = new URL(_request.url);
  const isPreview = requestUrl.searchParams.get("preview") === "1";
  const shareToken = requestUrl.searchParams.get("token");
  const verifiedShareToken = verifyPublicShareToken(shareToken);

  const { type, id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const isPublicShareAccess =
    !!verifiedShareToken &&
    verifiedShareToken.type === type &&
    verifiedShareToken.id === numericId;

  const session = isPublicShareAccess ? null : await getCurrentSession();
  if (!session && !isPublicShareAccess) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  let pdfBytes: Uint8Array;
  let attachmentName = `${type}_${numericId}.pdf`;

  if (type === "invoice") {
    const document = isPublicShareAccess
      ? await getInvoiceDocumentPublic(numericId)
      : await getInvoiceDocument(session!, numericId);
    if (!document) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    pdfBytes = await buildInvoicePdf(document);
  } else if (type === "receipt") {
    const document = isPublicShareAccess
      ? await getReceiptDocumentPublic(numericId)
      : await getReceiptDocument(session!, numericId);
    if (!document) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    pdfBytes = await buildReceiptPdf(document);
  } else if (type === "voucher" || type === "payment-voucher") {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const document = await getVoucherDocument(session, numericId);
    if (!document) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    pdfBytes = await buildVoucherPdf(document);
  } else if (type === "letter") {
    const document = isPublicShareAccess
      ? await getLetterDocumentPublic(numericId)
      : session
        ? await getLetterDocument(session, numericId)
        : null;
    if (!document) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }

    if (isPublicShareAccess && document.status !== "approved") {
      return NextResponse.json(
        { error: "Letter is not approved for public sharing" },
        { status: 403 },
      );
    }

    pdfBytes = await buildFormalLetterPdf(document);
  } else if (type === "incoming-letter") {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const document = await getIncomingLetterDocument(session, numericId);
    if (!document) {
      return NextResponse.json(
        { error: "Incoming letter not found" },
        { status: 404 },
      );
    }

    if (!document.pdfPath) {
      return NextResponse.json(
        { error: "Incoming letter file not found" },
        { status: 404 },
      );
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      document.pdfPath.replace(/^\/+/, ""),
    );
    try {
      pdfBytes = await readFile(filePath);
    } catch {
      return NextResponse.json(
        { error: "Incoming letter file not found" },
        { status: 404 },
      );
    }

    attachmentName = toAttachmentName(
      document.originalFileName,
      `incoming-letter-${document.referenceNumber ?? numericId}.pdf`,
    );
  } else if (type === "petty-cash" || type === "petty-cash-voucher") {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const document = await getPettyCashDocument(session, numericId);
    if (!document) {
      return NextResponse.json(
        { error: "Petty cash record not found" },
        { status: 404 },
      );
    }

    pdfBytes = await buildPettyCashPdf(document);
  } else {
    return NextResponse.json(
      { error: "Unsupported export type" },
      { status: 400 },
    );
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename=${attachmentName}`,
    },
  });
}
