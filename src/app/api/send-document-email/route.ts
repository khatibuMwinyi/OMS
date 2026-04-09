import { NextResponse } from "next/server";
import { z } from "zod";

import { buildInvoicePdf } from "@/lib/invoice-pdf";
import {
  ensureDocumentWorkflowColumns,
  getInvoiceDocument,
  getLetterDocument,
  getReceiptDocument,
} from "@/lib/records";
import { buildFormalLetterPdf } from "@/lib/letter-pdf";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { execute, isDatabaseConnectivityError } from "@/lib/db";
import { getCurrentSession } from "@/lib/session-server";

const requestSchema = z.object({
  type: z.enum(["invoice", "receipt", "letter"]),
  id: z.number().int().positive(),
  to: z.string().email(),
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildResendHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function resolveResendTimeoutMs() {
  const parsed = Number(process.env.RESEND_REQUEST_TIMEOUT_MS ?? 20000);
  if (!Number.isFinite(parsed)) {
    return 20000;
  }

  return Math.max(5000, Math.min(parsed, 120000));
}

async function sendViaResend(
  resendApiKey: string,
  payload: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    attachments: Array<{
      filename: string;
      content: string;
    }>;
  },
) {
  const timeoutMs = resolveResendTimeoutMs();
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: buildResendHeaders(resendApiKey),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new Error(`EMAIL_SERVICE_TIMEOUT:${timeoutMs}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function markDocumentSentViaEmail(
  tableName: "invoices" | "receipts" | "printed_letters",
  id: number,
  userId: number,
) {
  await execute(
    `UPDATE ${tableName}
     SET sent_at = IFNULL(sent_at, CURRENT_TIMESTAMP),
         sent_by = CASE WHEN sent_at IS NULL THEN ? ELSE sent_by END,
         sent_via = CASE WHEN sent_at IS NULL THEN 'email' ELSE sent_via END
     WHERE id = ?`,
    [userId, id],
  );
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 },
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email request." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    await ensureDocumentWorkflowColumns();

    if (!resendApiKey || !resendFromEmail) {
      return NextResponse.json(
        {
          error:
            "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment.",
        },
        { status: 500 },
      );
    }

    const { type, id, to } = parsed.data;

    let fileName = "document.pdf";
    let subject = "Document from Oweru Management System";
    let htmlBody = "";
    let pdfBytes: Uint8Array;

    if (type === "invoice") {
      const document = await getInvoiceDocument(session, id);
      if (!document) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }

    const totalAmount = Number(document.invoice.grandTotal ?? 0);
    const invoiceNumber = document.invoice.invoiceNumber;

    fileName = `invoice-${invoiceNumber}.pdf`;
    subject = `Invoice ${invoiceNumber}`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Invoice ${escapeHtml(invoiceNumber)}</h2>
        <p style="margin: 0 0 8px;">Customer: ${escapeHtml(document.invoice.customerName)}</p>
        <p style="margin: 0 0 8px;">Date: ${escapeHtml(formatDate(document.invoice.invoiceDate))}</p>
        <p style="margin: 0 0 16px;">Total: ${escapeHtml(formatCurrency(totalAmount))}</p>
        <p style="margin: 0 0 12px;">The invoice PDF is attached to this email.</p>
      </div>
    `;

      pdfBytes = await buildInvoicePdf(document);
    } else {
      if (type === "receipt") {
        const document = await getReceiptDocument(session, id);
        if (!document) {
          return NextResponse.json(
            { error: "Receipt not found." },
            { status: 404 },
          );
        }

      const totalAmount = Number(document.amount ?? 0);
      const receiptNumber = document.receiptNumber;

      fileName = `receipt-${receiptNumber}.pdf`;
      subject = `Receipt ${receiptNumber}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin: 0 0 12px;">Receipt ${escapeHtml(receiptNumber)}</h2>
          <p style="margin: 0 0 8px;">Customer: ${escapeHtml(document.customerName)}</p>
          <p style="margin: 0 0 8px;">Date: ${escapeHtml(formatDate(document.receiptDate))}</p>
          <p style="margin: 0 0 16px;">Amount: ${escapeHtml(formatCurrency(totalAmount))}</p>
          <p style="margin: 0 0 12px;">The receipt PDF is attached to this email.</p>
        </div>
      `;

        pdfBytes = await buildReceiptPdf(document);
      } else {
        const document = await getLetterDocument(session, id);
        if (!document) {
          return NextResponse.json({ error: "Letter not found." }, { status: 404 });
        }

        if (document.status !== "approved") {
          return NextResponse.json(
            { error: "Letter must be approved by admin before sending." },
            { status: 409 },
          );
        }

        const letterReference = document.referenceNumber ?? String(document.id);

        fileName = `letter-${letterReference}.pdf`;
        subject = `Letter ${letterReference}`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
            <h2 style="margin: 0 0 12px;">Letter ${escapeHtml(letterReference)}</h2>
            <p style="margin: 0 0 8px;">Recipient: ${escapeHtml(document.name)}</p>
            <p style="margin: 0 0 8px;">Date: ${escapeHtml(formatDate(document.letterDate ?? document.createdAt))}</p>
            <p style="margin: 0 0 16px;">Subject: ${escapeHtml(document.heading ?? document.description ?? "Official letter")}</p>
            <p style="margin: 0 0 12px;">The letter PDF is attached to this email.</p>
          </div>
        `;

        pdfBytes = await buildFormalLetterPdf(document);
      }
    }
    const resendResponse = await sendViaResend(resendApiKey, {
      from: resendFromEmail,
      to: [to],
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdfBytes).toString("base64"),
        },
      ],
    });

    if (!resendResponse.ok) {
      const details = await resendResponse.text().catch(() => "");
      let message = details;

      if (details) {
        try {
          const parsed = JSON.parse(details) as {
            message?: string;
            error?: string;
          };
          message = parsed.message ?? parsed.error ?? details;
        } catch {
          message = details;
        }
      }

      const status =
        resendResponse.status >= 400 && resendResponse.status < 500
          ? resendResponse.status
          : 502;

      return NextResponse.json(
        {
          error: message || "Failed to send email via Resend.",
        },
        { status },
      );
    }

    if (type === "invoice") {
      await markDocumentSentViaEmail("invoices", id, session.userId);
    } else if (type === "receipt") {
      await markDocumentSentViaEmail("receipts", id, session.userId);
    } else {
      await markDocumentSentViaEmail("printed_letters", id, session.userId);
    }

    return NextResponse.json({ status: "sent" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("EMAIL_SERVICE_TIMEOUT:")
    ) {
      const timeoutMs = error.message.split(":")[1] ?? "20000";
      return NextResponse.json(
        {
          error: `Email service timed out after ${Math.round(Number(timeoutMs) / 1000)} seconds. Please try again.`,
        },
        { status: 504 },
      );
    }

    if (isDatabaseConnectivityError(error)) {
      return NextResponse.json(
        {
          error:
            "Unable to connect to the database. Check MySQL service and DB_HOST/DB_PORT settings.",
        },
        { status: 503 },
      );
    }

    console.error("send-document-email failed", error);
    return NextResponse.json(
      { error: "Unexpected error while sending email." },
      { status: 500 },
    );
  }
}
