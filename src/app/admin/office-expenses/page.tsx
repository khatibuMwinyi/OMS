import { redirect } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createOfficeExpenseItemAction,
  updateOfficeExpenseItemAction,
  deleteOfficeExpenseItemAction,
  setOfficeBudgetAction,
} from "@/app/actions/projects";
import {
  buildOfficeBudgetStatusTable,
  ensureProjectTables,
  listOfficeExpenseItems,
} from "@/lib/projects";
import { getCurrentSession } from "@/lib/session-server";
import { BudgetFilter } from "./BudgetFilter";

function fmtTZS(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    edit?: string;
    year?: string;
    month?: string;
  }>;
};

export default async function AdminOfficeExpensesPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const sp = (await searchParams) ?? {};
  await ensureProjectTables();

  const { items } = await listOfficeExpenseItems("all", 1, 1000);

  const editId = Number(sp.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;
  const editItem = isEditing ? items.find((i) => i.id === editId) ?? null : null;
  if (isEditing && !editItem) {
    redirect("/admin/office-expenses?error=Item%20not%20found.");
  }

  const year = Number(sp.year) || new Date().getFullYear();
  const monthFilter = Number(sp.month) || new Date().getMonth() + 1;

  const status = await buildOfficeBudgetStatusTable(year);

  // For monthly items show only the selected month; for yearly show always.
  const visibleStatus = status.filter(
    (s) => s.recurrence === "yearly" || s.periodMonth === monthFilter,
  );

  const yearOptions: number[] = [];
  for (let y = new Date().getFullYear() - 1; y <= new Date().getFullYear() + 2; y++) {
    yearOptions.push(y);
  }

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/admin/office-expenses" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Administration</span>
            <h1 className="page-title">Office Expenses & Budgets</h1>
            <p className="subtle-copy">
              Master list of office-expense items and per-item budget caps.
              Recorded entries on the Land Project Office tab are validated
              against the cap for the matching period.
            </p>
          </div>
        </section>

        <RouteToast status={sp.status} error={sp.error} />

        {/* ── Items section ── */}
        <section className="module-grid module-grid--single">
          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">{isEditing ? "Edit item" : "Add item"}</span>
                <h2 className="section-title">
                  {isEditing ? "Update office-expense item" : "Create office-expense item"}
                </h2>
              </div>
            </div>

            {isEditing && editItem ? (
              <form action={updateOfficeExpenseItemAction} className="form-grid form-grid--wide">
                <input type="hidden" name="id" value={editItem.id} />
                <label className="space-y-2">
                  <span className="field-label">Name</span>
                  <Input name="name" defaultValue={editItem.name} required />
                </label>
                <label className="space-y-2">
                  <span className="field-label">Recurrence</span>
                  <Select name="recurrence" defaultValue={editItem.recurrence}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="field-label">Default amount (TZS)</span>
                  <Input
                    name="default_amount"
                    type="number"
                    defaultValue={Number(editItem.defaultAmount)}
                    required
                  />
                </label>
                <div className="button-row lg:col-span-2">
                  <Button type="submit">Update item</Button>
                  <a href="/admin/office-expenses" className="button-ghost">
                    Cancel
                  </a>
                </div>
              </form>
            ) : (
              <form action={createOfficeExpenseItemAction} className="form-grid form-grid--wide">
                <label className="space-y-2">
                  <span className="field-label">Name</span>
                  <Input name="name" placeholder="e.g. Internet" required />
                </label>
                <label className="space-y-2">
                  <span className="field-label">Recurrence</span>
                  <Select name="recurrence" defaultValue="monthly">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="field-label">Default amount (TZS)</span>
                  <Input name="default_amount" type="number" placeholder="e.g. 100000" required />
                </label>
                <div className="button-row lg:col-span-2">
                  <Button type="submit">Add item</Button>
                </div>
              </form>
            )}
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Master list</span>
                <h2 className="section-title">Items ({items.length})</h2>
              </div>
            </div>
            <div className="record-table-wrapper">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Recurrence</th>
                    <th>Default amount</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td data-label="Name">{it.name}</td>
                      <td data-label="Recurrence">{it.recurrence}</td>
                      <td data-label="Default amount">TZS {fmtTZS(Number(it.defaultAmount))}</td>
                      <td data-label="Actions" style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <a
                            href={`/admin/office-expenses?edit=${it.id}&year=${year}&month=${monthFilter}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-foreground/75 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                            aria-label="Edit item"
                            title="Edit item"
                          >
                            <Pencil size={14} />
                          </a>
                          <form action={deleteOfficeExpenseItemAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={it.id} />
                            <ConfirmSubmit
                              message="Delete this item? It must have no recorded expenses."
                              ariaLabel="Delete item"
                              title="Delete item"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-destructive shadow-sm transition hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/10"
                            >
                              <Trash2 size={14} />
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={4} style={{ padding: 24, color: "var(--muted)" }}>
                        No items. The xlsx seed runs on first DB init.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        {/* ── Budgets section ── */}
        <section className="section-card" style={{ marginTop: 18 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Budgets</span>
              <h2 className="section-title">
                Caps for {MONTH_NAMES[monthFilter - 1]} {year} (monthly) ·{" "}
                {year} (yearly)
              </h2>
            </div>
            <BudgetFilter
              year={year}
              monthFilter={monthFilter}
              yearOptions={yearOptions}
              monthNames={MONTH_NAMES}
            />
          </div>

          <div className="record-table-wrapper">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Period</th>
                  <th>Cap (TZS)</th>
                  <th>Spent</th>
                  <th>Retained</th>
                  <th>Update cap</th>
                </tr>
              </thead>
              <tbody>
                {visibleStatus.map((s) => {
                  const periodLabel =
                    s.periodMonth == null
                      ? `${s.periodYear}`
                      : `${MONTH_NAMES[s.periodMonth - 1]} ${s.periodYear}`;
                  return (
                    <tr key={`${s.itemId}-${s.periodYear}-${s.periodMonth ?? "y"}`}>
                      <td data-label="Item">{s.itemName}</td>
                      <td data-label="Period">
                        {periodLabel} <span style={{ opacity: 0.6 }}>({s.recurrence})</span>
                      </td>
                      <td data-label="Cap">
                        {s.hasBudget ? (
                          <>TZS {fmtTZS(s.limit)}</>
                        ) : (
                          <span style={{ color: "#fca5a5" }}>not set</span>
                        )}
                      </td>
                      <td data-label="Spent">TZS {fmtTZS(s.spent)}</td>
                      <td data-label="Retained">
                        {s.hasBudget ? (
                          <strong
                            style={{
                              color: s.retained > 0 ? "#9be2d1" : "#fca5a5",
                            }}
                          >
                            TZS {fmtTZS(s.retained)}
                          </strong>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Update cap">
                        <form
                          action={setOfficeBudgetAction}
                          style={{ display: "flex", gap: 6, alignItems: "center" }}
                        >
                          <input type="hidden" name="item_id" value={s.itemId} />
                          <input type="hidden" name="period_year" value={s.periodYear} />
                          <input
                            type="hidden"
                            name="period_month"
                            value={s.periodMonth ?? ""}
                          />
                          <Input
                            name="limit_amount"
                            type="number"
                            defaultValue={s.hasBudget ? s.limit : ""}
                            placeholder="Cap"
                            style={{ width: 140 }}
                            required
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}