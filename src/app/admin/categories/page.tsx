import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RouteToast } from "@/components/route-toast";
import { getCurrentSession } from "@/lib/session-server";

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/admin/categories" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Administration</span>
            <h1 className="page-title">Category Management</h1>
            <p className="subtle-copy">
              Manage transaction categories for receipts, petty cash, and payment
              vouchers.
            </p>
          </div>
        </section>

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        <section className="module-grid module-grid--single">
          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Quick Access</span>
                <h2 className="section-title">Category Modules</h2>
              </div>
            </div>

            <div className="category-cards">
              <a
                href="/admin/categories/receipts"
                className="category-card"
              >
                <span className="category-card-label">
                  Revenue Categories
                </span>
                <span className="category-card-title">
                  Receipt Categories
                </span>
                <span className="category-card-desc">
                  Manage income categories for receipts
                </span>
              </a>

              <a
                href="/admin/categories/petty-cash"
                className="category-card"
              >
                <span className="category-card-label">
                  Expense Categories
                </span>
                <span className="category-card-title">
                  Petty Cash Categories
                </span>
                <span className="category-card-desc">
                  Manage petty cash expense categories
                </span>
              </a>

              <a
                href="/admin/categories/vouchers"
                className="category-card"
              >
                <span className="category-card-label">
                  Expense Categories
                </span>
                <span className="category-card-title">
                  Voucher Categories
                </span>
                <span className="category-card-desc">
                  Manage payment voucher categories
                </span>
              </a>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}