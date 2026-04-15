"use client";

import { useMemo, useState } from "react";
import { deleteCategoryAction } from "@/app/actions/categories";
import { Input } from "@/components/ui/input";
import type { CategoryModule, CategoryRecord } from "@/lib/categories";

type Props = {
  categoryId: number;
  module: "receipt" | "petty_cash" | "voucher";
};

type CategoryFilterTableProps = {
  categories: CategoryRecord[];
  basePath: string;
  module: CategoryModule;
  emptyMessage: string;
};

export function CategoryDeleteButton({ categoryId, module }: Props) {
  const handleDelete = async () => {
    if (!confirm("Delete this category?")) {
      return;
    }

    const formData = new FormData();
    formData.append("category_id", String(categoryId));
    formData.append("module", module);

    await deleteCategoryAction(formData);
  };

  return (
    <button
      type="button"
      className="text-sm text-destructive hover:underline"
      onClick={handleDelete}
    >
      Delete
    </button>
  );
}

export function CategoryFilterTable({
  categories,
  basePath,
  module,
  emptyMessage,
}: CategoryFilterTableProps) {
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedFilter) {
      return categories;
    }

    return categories.filter((category) => {
      const categoryName = category.category.toLowerCase();
      const description = category.description?.toLowerCase() ?? "";
      return (
        categoryName.includes(normalizedFilter) ||
        description.includes(normalizedFilter)
      );
    });
  }, [categories, normalizedFilter]);

  if (categories.length === 0) {
    return <div className="category-empty">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Filter categories by name or description.
        </p>
        <div className="min-w-0 flex-1 sm:max-w-[320px]">
          <Input
            type="search"
            placeholder="Filter categories and description"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter categories by name or description"
          />
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="category-empty">No categories match your filter.</div>
      ) : (
        <div className="record-table-wrapper">
          <table className="record-table">
            <thead>
              <tr className="border-b border-border/85">
                <th>Code</th>
                <th>Category</th>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>{category.code}</td>
                  <td>{category.category}</td>
                  <td>{category.type || "-"}</td>
                  <td>{category.description || "-"}</td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-3">
                      <a
                        href={`${basePath}?edit=${category.id}`}
                        className="category-action-edit"
                      >
                        Edit
                      </a>
                      <CategoryDeleteButton
                        categoryId={category.id}
                        module={module}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}