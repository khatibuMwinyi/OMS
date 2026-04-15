"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { execute, queryRows } from "@/lib/db";
import { type CategoryModule } from "@/lib/categories";
import { getCurrentSession } from "@/lib/session-server";

function goWithMessage(
  path: string,
  type: "status" | "error",
  message: string,
): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }
  return session;
}

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

const categorySchema = z.object({
  module: z.enum(["receipt", "petty_cash", "voucher"]),
  code: z.string().min(1),
  category: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
});

export async function createCategoryAction(formData: FormData) {
  const session = await requireSession();
  const module = asString(formData.get("module")) as CategoryModule;

  const pathMap: Record<CategoryModule, string> = {
    receipt: "/admin/categories/receipts",
    petty_cash: "/admin/categories/petty-cash",
    voucher: "/admin/categories/vouchers",
  };

  const parsed = categorySchema.safeParse({
    module,
    code: asString(formData.get("code")),
    category: asString(formData.get("category")),
    type: asString(formData.get("type")) || null,
    description: asString(formData.get("description")) || null,
  });

  if (!parsed.success) {
    goWithMessage(
      pathMap[module],
      "error",
      parsed.error.issues[0]?.message ?? "Invalid category data",
    );
  }

  const existing = await queryRows<{ id: number }>(
    `SELECT id FROM categories WHERE module = ? AND code = ? LIMIT 1`,
    [parsed.data.module, parsed.data.code],
  );

  if (existing.length > 0) {
    goWithMessage(pathMap[module], "error", "Category code already exists");
  }

  await execute(
    `INSERT INTO categories (module, category, code, type, description, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      parsed.data.module,
      parsed.data.category,
      parsed.data.code,
      parsed.data.type || null,
      parsed.data.description || null,
      session.userId,
    ],
  );

  revalidatePath(pathMap[module]);
  goWithMessage(pathMap[module], "status", "Category saved successfully.");
}

const updateCategorySchema = categorySchema.extend({
  category_id: z.coerce.number().int(),
});

export async function updateCategoryAction(formData: FormData) {
  const session = await requireSession();
  const module = asString(formData.get("module")) as CategoryModule;

  const pathMap: Record<CategoryModule, string> = {
    receipt: "/admin/categories/receipts",
    petty_cash: "/admin/categories/petty-cash",
    voucher: "/admin/categories/vouchers",
  };

  const parsed = updateCategorySchema.safeParse({
    category_id: formData.get("category_id"),
    module,
    code: asString(formData.get("code")),
    category: asString(formData.get("category")),
    type: asString(formData.get("type")) || null,
    description: asString(formData.get("description")) || null,
  });

  if (!parsed.success) {
    goWithMessage(
      pathMap[module],
      "error",
      parsed.error.issues[0]?.message ?? "Invalid category data",
    );
  }

  const isLegacyEntry = parsed.data.category_id < 0;

  if (isLegacyEntry) {
    const codeCheck = await queryRows<{ id: number }>(
      `SELECT id FROM categories WHERE module = ? AND code = ? LIMIT 1`,
      [parsed.data.module, parsed.data.code],
    );

    if (codeCheck.length > 0) {
      goWithMessage(pathMap[module], "error", "Category code already exists");
    }

    await execute(
      `INSERT INTO categories (module, category, code, type, description, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parsed.data.module,
        parsed.data.category,
        parsed.data.code,
        parsed.data.type || null,
        parsed.data.description || null,
        session.userId,
      ],
    );

    revalidatePath(pathMap[module]);
    goWithMessage(pathMap[module], "status", "Category saved successfully.");
  }

  const existing = await queryRows<{ id: number }>(
    `SELECT id FROM categories WHERE id = ? LIMIT 1`,
    [parsed.data.category_id],
  );

  if (existing.length === 0) {
    goWithMessage(pathMap[module], "error", "Category not found");
  }

  const codeCheck = await queryRows<{ id: number }>(
    `SELECT id FROM categories WHERE module = ? AND code = ? AND id != ? LIMIT 1`,
    [parsed.data.module, parsed.data.code, parsed.data.category_id],
  );

  if (codeCheck.length > 0) {
    goWithMessage(pathMap[module], "error", "Category code already exists");
  }

  await execute(
    `UPDATE categories SET category = ?, code = ?, type = ?, description = ? WHERE id = ?`,
    [
      parsed.data.category,
      parsed.data.code,
      parsed.data.type || null,
      parsed.data.description || null,
      parsed.data.category_id,
    ],
  );

  revalidatePath(pathMap[module]);
  goWithMessage(pathMap[module], "status", "Category updated successfully.");
}

const deleteCategorySchema = z.object({
  category_id: z.coerce.number().int(),
  module: z.enum(["receipt", "petty_cash", "voucher"]),
});

export async function deleteCategoryAction(formData: FormData) {
  const session = await requireSession();

  const parsed = deleteCategorySchema.safeParse({
    category_id: formData.get("category_id"),
    module: formData.get("module"),
  });

  if (!parsed.success) {
    goWithMessage(
      "/admin/categories",
      "error",
      parsed.error.issues[0]?.message ?? "Invalid category deletion",
    );
  }

  const pathMap: Record<CategoryModule, string> = {
    receipt: "/admin/categories/receipts",
    petty_cash: "/admin/categories/petty-cash",
    voucher: "/admin/categories/vouchers",
  };

  if (parsed.data.category_id < 0) {
    revalidatePath(pathMap[parsed.data.module]);
    revalidatePath("/admin/categories");
    goWithMessage(pathMap[parsed.data.module], "status", "Legacy entry removed.");
  }

  const result = await execute(`DELETE FROM categories WHERE id = ?`, [
    parsed.data.category_id,
  ]);

  if (result.affectedRows === 0) {
    goWithMessage(pathMap[parsed.data.module], "error", "Category not found");
  }

  revalidatePath(pathMap[parsed.data.module]);
  revalidatePath("/admin/categories");
  goWithMessage(pathMap[parsed.data.module], "status", "Category deleted successfully.");
}