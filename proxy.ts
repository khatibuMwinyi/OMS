import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  createSessionToken,
  verifySessionToken,
} from "./src/lib/session";

function refreshSessionCookie(
  response: NextResponse,
  request: NextRequest,
  session: NonNullable<ReturnType<typeof verifySessionToken>>,
) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken(session),
    buildSessionCookieOptions(),
  );
  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (pathname === "/") {
    if (session) {
      return refreshSessionCookie(
        NextResponse.redirect(new URL("/dashboard", request.url)),
        request,
        session,
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return refreshSessionCookie(NextResponse.next(), request, session);
  }

  // ── Projects: director + admin only ─────────────────────────────────────────
  if (pathname.startsWith("/projects")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (session.role !== "director" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return refreshSessionCookie(NextResponse.next(), request, session);
  }

  if (
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/receipts") ||
    pathname.startsWith("/petty-cash") ||
    pathname.startsWith("/payment-vouchers") ||
    pathname.startsWith("/letters") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/approvals")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (
      pathname.startsWith("/approvals") &&
      session.role !== "admin" &&
      session.role !== "director"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return refreshSessionCookie(NextResponse.next(), request, session);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/projects/:path*",
    "/invoices/:path*",
    "/receipts/:path*",
    "/petty-cash/:path*",
    "/payment-vouchers/:path*",
    "/letters/:path*",
    "/admin/:path*",
    "/approvals/:path*",
  ],
};