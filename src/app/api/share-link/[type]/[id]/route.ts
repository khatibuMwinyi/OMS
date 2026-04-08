import { NextResponse } from "next/server";

import { getInvoiceDocument, getReceiptDocument } from "@/lib/records";
import {
  buildPublicShareBaseUrl,
  createPublicShareToken,
  getPublicShareLinkTtlMinutes,
  type PublicShareType,
} from "@/lib/public-share";
import { getCurrentSession } from "@/lib/session-server";

type RouteParams = {
  params: Promise<{ type: string; id: string }>;
};

function normalizeType(raw: string): PublicShareType | null {
  const value = raw.trim().toLowerCase();

  if (value === "invoice") {
    return "invoice";
  }

  if (value === "receipt") {
    return "receipt";
  }

  return null;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { type: rawType, id } = await params;
  const type = normalizeType(rawType);
  if (!type) {
    return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  if (type === "invoice") {
    const document = await getInvoiceDocument(session, numericId);
    if (!document) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
  } else {
    const document = await getReceiptDocument(session, numericId);
    if (!document) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }
  }

  const ttlMinutes = getPublicShareLinkTtlMinutes();
  const expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;
  const token = createPublicShareToken({
    type,
    id: numericId,
    exp: expiresAtMs,
  });

  const origin = buildPublicShareBaseUrl(request.url);
  const shareUrl = new URL(`/api/export/${type}/${numericId}`, origin);
  shareUrl.searchParams.set("token", token);

  return NextResponse.json({
    url: shareUrl.toString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    ttlMinutes,
  });
}
