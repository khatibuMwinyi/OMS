import { NextResponse } from "next/server";
import { z } from "zod";

import { buildInvoicePdf } from "@/lib/invoice-pdf";
import {
  getInvoiceDocument,
  getReceiptDocument,
} from "@/lib/records";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import {
  buildPublicShareBaseUrl,
  createPublicShareToken,
  getPublicShareLinkTtlMinutes,
  type PublicShareType,
} from "@/lib/public-share";
import { getCurrentSession } from "@/lib/session-server";

const requestSchema = z.object({
  type: z.enum(["invoice", "receipt"]),
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

function buildShareUrl(
  requestUrl: string,
  type: PublicShareType,
  id: number,
  expiresAtMs: number,
) {
  const token = createPublicShareToken({ type, id, exp: expiresAtMs });
  const origin = buildPublicShareBaseUrl(requestUrl);
  const url = new URL(`/api/export/${type}/${id}`, origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email request." }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();

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
    const ttlMinutes = getPublicShareLinkTtlMinutes();
    const expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;
    const publicUrl = buildShareUrl(request.url, type, id, expiresAtMs);

    fileName = `invoice-${invoiceNumber}.pdf`;
    subject = `Invoice ${invoiceNumber}`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Invoice ${escapeHtml(invoiceNumber)}</h2>
        <p style="margin: 0 0 8px;">Customer: ${escapeHtml(document.invoice.customerName)}</p>
        <p style="margin: 0 0 8px;">Date: ${escapeHtml(formatDate(document.invoice.invoiceDate))}</p>
        <p style="margin: 0 0 16px;">Total: ${escapeHtml(formatCurrency(totalAmount))}</p>
        <p style="margin: 0 0 12px;">The invoice PDF is attached to this email.</p>
        <p style="margin: 0 0 8px;">Temporary public link (expires in ${ttlMinutes} minutes):</p>
        <p style="margin: 0;"><a href="${publicUrl}">${publicUrl}</a></p>
      </div>
    `;

    pdfBytes = await buildInvoicePdf(document);
  } else {
    const document = await getReceiptDocument(session, id);
    if (!document) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    const totalAmount = Number(document.amount ?? 0);
    const receiptNumber = document.receiptNumber;
    const ttlMinutes = getPublicShareLinkTtlMinutes();
    const expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;
    const publicUrl = buildShareUrl(request.url, type, id, expiresAtMs);

    fileName = `receipt-${receiptNumber}.pdf`;
    subject = `Receipt ${receiptNumber}`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Receipt ${escapeHtml(receiptNumber)}</h2>
        <p style="margin: 0 0 8px;">Customer: ${escapeHtml(document.customerName)}</p>
        <p style="margin: 0 0 8px;">Date: ${escapeHtml(formatDate(document.receiptDate))}</p>
        <p style="margin: 0 0 16px;">Amount: ${escapeHtml(formatCurrency(totalAmount))}</p>
        <p style="margin: 0 0 12px;">The receipt PDF is attached to this email.</p>
        <p style="margin: 0 0 8px;">Temporary public link (expires in ${ttlMinutes} minutes):</p>
        <p style="margin: 0;"><a href="${publicUrl}">${publicUrl}</a></p>
      </div>
    `;

    pdfBytes = await buildReceiptPdf(document);
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: buildResendHeaders(resendApiKey),
    body: JSON.stringify({
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
    }),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text().catch(() => "");
    return NextResponse.json(
      {
        error: details || "Failed to send email via Resend.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ status: "sent" });
}
