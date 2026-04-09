import { createHmac, timingSafeEqual } from "crypto";

export type PublicShareType = "invoice" | "receipt" | "letter";

export type PublicShareTokenPayload = {
  type: PublicShareType;
  id: number;
  exp: number;
};

const DEFAULT_PUBLIC_SHARE_TTL_MINUTES = 120;

function getPublicShareSecret() {
  return (
    process.env.PUBLIC_SHARE_SECRET ??
    process.env.SESSION_SECRET ??
    "oweru-development-public-share-secret"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadPart: string) {
  return createHmac("sha256", getPublicShareSecret())
    .update(payloadPart)
    .digest("base64url");
}

export function getPublicShareLinkTtlMinutes() {
  const parsed = Number(process.env.PUBLIC_LINK_TTL_MINUTES ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PUBLIC_SHARE_TTL_MINUTES;
  }

  return Math.floor(parsed);
}

export function createPublicShareToken(payload: PublicShareTokenPayload) {
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signaturePart = signPayload(payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export function verifyPublicShareToken(
  token?: string | null,
): PublicShareTokenPayload | null {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = signPayload(payloadPart);
  const providedSignature = Buffer.from(signaturePart);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(payloadPart),
    ) as PublicShareTokenPayload;

    if (
      payload.type !== "invoice" &&
      payload.type !== "receipt" &&
      payload.type !== "letter"
    ) {
      return null;
    }

    if (!Number.isInteger(payload.id) || payload.id <= 0) {
      return null;
    }

    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildPublicShareBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Ignore malformed PUBLIC_APP_URL and fallback to request origin.
    }
  }

  return new URL(requestUrl).origin;
}
