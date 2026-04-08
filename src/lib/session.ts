import { createHmac, timingSafeEqual } from "crypto";

import { SESSION_IDLE_TIMEOUT_MS } from "./session-config";

export type UserRole = "admin" | "secretary";

export type SessionUser = {
  userId: number;
  username: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
};

export const SESSION_COOKIE_NAME = "oweru_session";
const SESSION_TTL_MS = SESSION_IDLE_TIMEOUT_MS;

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "oweru-development-session-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(user: {
  userId: number;
  username: string;
  role: UserRole;
}) {
  const now = Date.now();
  const payload: SessionUser = {
    ...user,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signaturePart = signPayload(payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = signPayload(payloadPart);
  const providedSignature = Buffer.from(signaturePart);
  const verifiedSignature = Buffer.from(expectedSignature);

  if (
    providedSignature.length !== verifiedSignature.length ||
    !timingSafeEqual(providedSignature, verifiedSignature)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payloadPart)) as SessionUser;
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function buildClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
