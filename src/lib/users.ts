import { queryRows } from "./db";

export type UserRecord = {
  id: number;
  username: string;
  role: "admin" | "secretary";
  createdAt: string;
};

export async function listUsers() {
  return queryRows<UserRecord>(
    `SELECT id, username, role, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC`,
    [],
  ).catch(() => []);
}