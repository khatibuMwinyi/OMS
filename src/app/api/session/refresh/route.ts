import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookieOptions,
  buildSessionCookieOptions,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    const response = NextResponse.json(
      { error: "Session expired." },
      { status: 401 },
    );
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      buildClearedSessionCookieOptions(),
    );
    return response;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken({
      userId: session.userId,
      username: session.username,
      role: session.role,
    }),
    buildSessionCookieOptions(),
  );

  return response;
}