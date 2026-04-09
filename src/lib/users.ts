import { queryRows } from "./db";
import { ensureDocumentWorkflowColumns } from "./records";

export type UserRecord = {
  id: number;
  username: string;
  role: "admin" | "secretary";
  signatureImagePath: string | null;
  createdAt: string;
};

export async function listUsers() {
  await ensureDocumentWorkflowColumns();
  return queryRows<UserRecord>(
    `SELECT id, username, role, signature_image_path AS signatureImagePath, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC`,
    [],
  ).catch(() => []);
}