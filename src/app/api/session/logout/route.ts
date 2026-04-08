import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookieOptions,
} from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    buildClearedSessionCookieOptions(),
  );
  return response;
}