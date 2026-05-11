"use server";

import { access } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { execute, queryRows } from "@/lib/db";
import { getCurrentSession } from "@/lib/session-server";
import { ensurePettyCashStatusColumns } from "@/lib/records";

function makeApprovalResult(
  module: string,
  type: "status" | "error",
  message: string,
) {
  return {
    message,
    type,
    token: Math.random().toString(36).slice(2),
  };
}

async function requireAdminOrDirector() {
  const session = await getCurrentSession();
  if (!session) redirect("/");
  if (session.role !== "admin" && session.role !== "director") redirect("/reports");
  return session;
}

async function resolveSignaturePath(signaturePath: string): Promise<string> {
  const trimmed = signaturePath.trim();
  if (!trimmed) return "";

  const ext = path.extname(trimmed).toLowerCase();
  const candidates = [trimmed];

  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    const base = trimmed.slice(0, -ext.length);
    candidates.push(`${base}.png`, `${base}.jpg`, `${base}.jpeg`);
  } else if (!ext) {
    candidates.push(`${trimmed}.png`, `${trimmed}.jpg`, `${trimmed}.jpeg`);
  }

  for (const candidate of Array.from(new Set(candidates))) {
    const absPath = path.join(process.cwd(), "public", candidate.replace(/^\/+/, ""));
    try {
      await access(absPath);
      return candidate;
    } catch {
      // continue
    }
  }

  return "";
}

// ─── Petty Cash ───────────────────────────────────────────────────────────────

const pettyCashSchema = z.object({
  petty_cash_id: z.coerce.number().int().positive(),
  status: z.enum(["approved", "rejected"]),
  comment: z.string().trim().optional(),
  _period_params: z.string().optional(),
});

export async function approvePettyCashFromReports(
  prevState: { message?: string; type?: "status" | "error"; token?: string } | null,
  formData: FormData,
) {
  const session = await requireAdminOrDirector();
  await ensurePettyCashStatusColumns();

  const parsed = pettyCashSchema.safeParse({
    petty_cash_id: formData.get("petty_cash_id"),
    status: formData.get("status"),
    comment: formData.get("comment"),
    _period_params: formData.get("_period_params"),
  });

  if (!parsed.success) {
    return makeApprovalResult("petty-cash", "error", "Invalid approval request.");
  }

  const comment = parsed.data.comment?.trim() ?? "";
  if (parsed.data.status === "rejected" && !comment) {
    return makeApprovalResult("petty-cash", "error", "A comment is required when rejecting.");
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (parsed.data.status === "approved") {
    await execute(
      `UPDATE petty_cash_transactions
       SET status = 'approved', approved_by = ?, approved_at = ?,
           rejected_by = NULL, rejected_at = NULL
       WHERE id = ?`,
      [session.userId, now, parsed.data.petty_cash_id],
    );
  } else {
    await execute(
      `UPDATE petty_cash_transactions
       SET status = 'rejected', rejected_by = ?, rejected_at = ?,
           approved_by = NULL, approved_at = NULL
       WHERE id = ?`,
      [session.userId, now, parsed.data.petty_cash_id],
    );
  }

  revalidatePath("/reports");
  revalidatePath("/petty-cash");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");

  return makeApprovalResult(
    "petty-cash",
    "status",
    parsed.data.status === "approved" ? "Petty cash record approved." : "Petty cash record rejected.",
  );
}

// ─── Payment Voucher ──────────────────────────────────────────────────────────

const voucherSchema = z.object({
  voucher_id: z.coerce.number().int().positive(),
  status: z.enum(["approved", "rejected"]),
  admin_comment: z.string().trim().optional(),
  _period_params: z.string().optional(),
});

export async function approveVoucherFromReports(
  prevState: { message?: string; type?: "status" | "error"; token?: string } | null,
  formData: FormData,
) {
  const session = await requireAdminOrDirector();

  const parsed = voucherSchema.safeParse({
    voucher_id: formData.get("voucher_id"),
    status: formData.get("status"),
    admin_comment: formData.get("admin_comment"),
    _period_params: formData.get("_period_params"),
  });

  if (!parsed.success) {
    return makeApprovalResult("payment-vouchers", "error", "Invalid approval request.");
  }

  const comment = parsed.data.admin_comment?.trim() ?? "";
  if (parsed.data.status === "rejected" && !comment) {
    return makeApprovalResult("payment-vouchers", "error", "A rejection comment is required.");
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (parsed.data.status === "approved") {
    await execute(
      `UPDATE payment_vouchers
       SET status = 'approved', admin_comment = NULL,
           approved_by = ?, approved_at = ?,
           rejected_by = NULL, rejected_at = NULL
       WHERE id = ?`,
      [session.userId, now, parsed.data.voucher_id],
    );
  } else {
    await execute(
      `UPDATE payment_vouchers
       SET status = 'rejected', admin_comment = ?,
           rejected_by = ?, rejected_at = ?,
           approved_by = NULL, approved_at = NULL
       WHERE id = ?`,
      [comment, session.userId, now, parsed.data.voucher_id],
    );
  }

  revalidatePath("/reports");
  revalidatePath("/payment-vouchers");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");

  return makeApprovalResult(
    "payment-vouchers",
    "status",
    parsed.data.status === "approved" ? "Voucher approved." : "Voucher rejected with comment.",
  );
}

// ─── Letter ───────────────────────────────────────────────────────────────────

const letterSchema = z.object({
  letter_id: z.coerce.number().int().positive(),
  _period_params: z.string().optional(),
});

export async function approveLetterFromReports(
  prevState: { message?: string; type?: "status" | "error"; token?: string } | null,
  formData: FormData,
) {
  const session = await requireAdminOrDirector();

  const parsed = letterSchema.safeParse({
    letter_id: formData.get("letter_id"),
    _period_params: formData.get("_period_params"),
  });

  if (!parsed.success) {
    return makeApprovalResult("letters", "error", "Invalid letter approval request.");
  }

  const [adminUser] = await queryRows<{ signatureImagePath: string | null }>(
    `SELECT signature_image_path AS signatureImagePath FROM users WHERE id = ? LIMIT 1`,
    [session.userId],
  );

  const configuredPath =
    adminUser?.signatureImagePath?.trim() ||
    process.env.ADMIN_SIGNATURE_IMAGE_PATH?.trim() ||
    "";

  if (!configuredPath) {
    return makeApprovalResult(
      "letters",
      "error",
      "Admin signature is not configured. Set signature_image_path on your user account.",
    );
  }

  const resolvedPath = await resolveSignaturePath(configuredPath);

  if (!resolvedPath) {
    return makeApprovalResult("letters", "error", "Signature image file was not found on disk.");
  }

  const result = await execute(
    `UPDATE printed_letters
     SET status = 'approved',
         approved_by = ?,
         approved_at = CURRENT_TIMESTAMP,
         approved_signature_path = ?
     WHERE id = ?`,
    [session.userId, resolvedPath, parsed.data.letter_id],
  );

  if (result.affectedRows === 0) {
    return makeApprovalResult("letters", "error", "Letter not found.");
  }

  revalidatePath("/reports");
  revalidatePath("/letters");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");

  return makeApprovalResult("letters", "status", "Letter approved successfully.");
}