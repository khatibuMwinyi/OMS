import { execute, queryRows } from "./db";
import type { SessionUser } from "./session";
import {
  legacyPettyCashRecords,
  legacyReceiptRecords,
  legacyVoucherRecords,
} from "./legacy-form-data";

export type CategoryModule = "receipt" | "petty_cash" | "voucher";

export type CategoryRecord = {
  id: number;
  module: CategoryModule;
  category: string;
  code: string;
  type: string | null;
  description: string | null;
  userId: number;
  createdAt: string;
};

type LegacyCategoryRecord = {
  type: string;
  category: string;
  code: string;
  description: string;
};

let categoriesTableReady: Promise<void> | null = null;

export function ensureCategoriesTable() {
  if (!categoriesTableReady) {
    categoriesTableReady = execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module ENUM('receipt', 'petty_cash', 'voucher') NOT NULL,
        category VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        type VARCHAR(20) NULL,
        description TEXT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_categories_module (module),
        KEY idx_categories_code (code),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).then(() => undefined);
  }

  return categoriesTableReady;
}

async function firstOrNull<T>(
  sql: string,
  params: Array<string | number>,
): Promise<T | null> {
  const [row] = await queryRows<T>(sql, params);
  return row ?? null;
}

export async function listCategoriesByModule(module: CategoryModule) {
  await ensureCategoriesTable();
  return queryRows<CategoryRecord>(
    `SELECT id, module, category, code, type, description, user_id AS userId, created_at AS createdAt
     FROM categories
     WHERE module = ?
     ORDER BY code ASC`,
    [module],
  ).catch(() => []);
}

export async function getCategoryById(
  _session: SessionUser,
  categoryId: number,
): Promise<CategoryRecord | null> {
  await ensureCategoriesTable();
  return firstOrNull<CategoryRecord>(
    `SELECT id, module, category, code, type, description, user_id AS userId, created_at AS createdAt
     FROM categories
     WHERE id = ?
     LIMIT 1`,
    [categoryId],
  );
}

export async function getNextCategoryCode(module: CategoryModule) {
  await ensureCategoriesTable();

  const prefixMap: Record<CategoryModule, string> = {
    receipt: "RC",
    petty_cash: "PC",
    voucher: "EC",
  };

  const prefix = prefixMap[module];
  const record = await firstOrNull<{ code: string }>(
    `SELECT code FROM categories WHERE module = ? AND code LIKE ? ORDER BY code DESC LIMIT 1`,
    [module, `${prefix}%`],
  );

  if (!record) {
    return `${prefix}-001`;
  }

  const numericSuffix = record.code.match(/^.*?-(\d+)$/)?.[1];
  if (!numericSuffix) {
    return `${prefix}-001`;
  }

  const nextNumber = Number(numericSuffix) + 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

function convertLegacyToCategoryRecord(
  records: LegacyCategoryRecord[],
  module: CategoryModule,
): CategoryRecord[] {
  return records.map((record, index) => ({
    id: -1 - index,
    module,
    category: record.category,
    code: record.code,
    type: record.type,
    description: record.description,
    userId: 0,
    createdAt: new Date().toISOString(),
  }));
}

export async function getCategoriesWithFallback(module: CategoryModule) {
  const dbCategories = await listCategoriesByModule(module);

  const legacyMap: Record<CategoryModule, LegacyCategoryRecord[]> = {
    receipt: legacyReceiptRecords,
    petty_cash: legacyPettyCashRecords,
    voucher: legacyVoucherRecords,
  };

  const legacyCategories = convertLegacyToCategoryRecord(legacyMap[module], module);

  const allCategories = [...legacyCategories, ...dbCategories];
  
  allCategories.sort((a, b) => a.code.localeCompare(b.code));
  
  return allCategories;
}