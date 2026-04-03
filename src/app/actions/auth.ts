"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, queryRows } from "@/lib/db";
import { getCurrentSession } from "@/lib/session-server";
import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookieOptions,
  buildSessionCookieOptions,
  createSessionToken,
} from "@/lib/session";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginUserRow = {
  id: number;
  username: string;
  password: string;
  role: "admin" | "secretary";
};

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState | never> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const [user] = await queryRows<LoginUserRow>(
    "SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1",
    [parsed.data.username],
  );

  if (!user) {
    return { error: "Invalid credentials" };
  }

  const isHashed = user.password.startsWith("$2");
  const passwordMatches = isHashed
    ? await bcrypt.compare(parsed.data.password, user.password)
    : user.password === parsed.data.password;

  if (!passwordMatches) {
    return { error: "Invalid credentials" };
  }

  if (!isHashed) {
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    await execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      user.id,
    ]);
  }

  const sessionToken = createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    sessionToken,
    buildSessionCookieOptions(),
  );

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", buildClearedSessionCookieOptions());
  redirect("/");
}

const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "secretary"]),
});

export async function createUserAction(
  formData: FormData,
): Promise<never> {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/users?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid user data",
      )}`,
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  try {
    await execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [
      parsed.data.username,
      hashedPassword,
      parsed.data.role,
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Duplicate entry")) {
      redirect("/admin/users?error=That%20username%20already%20exists.");
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/users");
  redirect("/admin/users?status=User%20created%20successfully.");
}
