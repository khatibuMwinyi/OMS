import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCategoriesWithFallback,
  getNextCategoryCode,
} from "@/lib/categories";
import { getCurrentSession } from "@/lib/session-server";

import { createCategoryAction, updateCategoryAction } from "../../../actions/categories";
import { CategoryFilterTable } from "@/components/category-delete-button";

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    edit?: string;
  }>;
};

export default async function VoucherCategoriesPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;

  const categories = await getCategoriesWithFallback("voucher");
  const editCategory = isEditing
    ? categories.find((c) => c.id === editId)
    : null;
  const nextCode = isEditing
    ? editCategory?.code ?? ""
    : await getNextCategoryCode("voucher");

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/admin/categories/vouchers" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Administration</span>
            <h1 className="page-title">Voucher Categories</h1>
            <p className="subtle-copy">
              Manage expense categories for payment voucher transactions.
            </p>
          </div>
        </section>

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        <section className="category-layout">
          <section className="category-form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  {isEditing ? "Edit category" : "Add category"}
                </span>
                <h2 className="section-title">Category Details</h2>
              </div>
            </div>

            <form
              action={isEditing ? updateCategoryAction : createCategoryAction}
              className="category-form"
            >
              <input type="hidden" name="module" value="voucher" />
              {isEditing && editCategory ? (
                <input
                  type="hidden"
                  name="category_id"
                  value={editCategory.id}
                  readOnly
                />
              ) : null}
              <div className="form-field">
                <label className="field-label">Code</label>
                <Input
                  name="code"
                  defaultValue={nextCode}
                  readOnly={isEditing}
                  required
                  className="w-full"
                />
              </div>
              <div className="form-field">
                <label className="field-label">Category Name</label>
                <Input
                  name="category"
                  defaultValue={editCategory?.category ?? ""}
                  placeholder="e.g., Office & Administration"
                  required
                  className="w-full"
                />
              </div>
              <div className="form-field">
                <label className="field-label">Type</label>
                <Input
                  name="type"
                  defaultValue={editCategory?.type ?? "Expense"}
                  readOnly
                  className="w-full"
                />
              </div>
              <div className="form-field form-field-full">
                <label className="field-label">Description</label>
                <Input
                  name="description"
                  defaultValue={editCategory?.description ?? ""}
                  placeholder="Category description"
                  className="w-full"
                />
              </div>
              <div className="form-actions">
                <Button type="submit">
                  {isEditing ? "Update Category" : "Add Category"}
                </Button>
                {isEditing ? (
                  <a href="/admin/categories/vouchers" className="btn btn-outline">
                    Cancel
                  </a>
                ) : null}
              </div>
            </form>
          </section>

          <section className="category-list-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Current Categories</span>
                <h2 className="section-title">Voucher Categories</h2>
              </div>
            </div>

            <CategoryFilterTable
              categories={categories}
              basePath="/admin/categories/vouchers"
              module="voucher"
              emptyMessage="No categories found. Add a category to get started."
            />
          </section>
        </section>
      </div>
    </main>
  );
}