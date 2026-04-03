import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
