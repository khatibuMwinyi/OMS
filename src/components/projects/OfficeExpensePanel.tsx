"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  recordOfficeExpenseAction,
  deleteOfficeExpenseAction,
} from "@/app/actions/projects";
import type { OfficeExpense, OfficeExpenseItem } from "@/lib/projects";

function fmtTZS(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

function periodLabel(year: number, month: number | null) {
  if (month == null) return `${year}`;
  return `${new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "short",
  })} ${year}`;
}

type Props = {
  sequenceId: number;
  sequenceTotalProjects: number;
  items: OfficeExpenseItem[];
  entries: OfficeExpense[];
  canDelete: boolean;
};

export function OfficeExpensePanel({
  sequenceId,
  sequenceTotalProjects,
  items,
  entries,
  canDelete,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [itemId, setItemId] = useState<number>(items[0]?.id ?? 0);
  const [date, setDate] = useState<string>(today);
  const [amount, setAmount] = useState<string>("");

  const selectedItem = useMemo(
    () => items.find((i) => i.id === itemId) ?? null,
    [itemId, items],
  );

  // Live status: spent so far in the matching period for the selected item
  const periodInfo = useMemo(() => {
    if (!selectedItem) return null;
    const [y, m] = date.split("-").map(Number);
    const month = selectedItem.recurrence === "monthly" ? m : null;
    const year = y;
    const spent = entries
      .filter((e) => {
        if (e.itemId !== selectedItem.id) return false;
        const raw = e.expenseDate;
        const dateStr = String(raw ?? "").slice(0, 10);
        const [ey, em] = dateStr.split("-").map(Number);
        return month != null
          ? ey === year && em === month
          : ey === year;
      })
      .reduce((s, e) => s + Number(e.amount), 0);
    const cap = Number(selectedItem.defaultAmount);
    return {
      label: periodLabel(year, month),
      spent,
      cap,
      retained: Math.max(0, cap - spent),
    };
  }, [selectedItem, date, entries]);

  const monthlyItems = items.filter((i) => i.recurrence === "monthly");
  const yearlyItems = items.filter((i) => i.recurrence === "yearly");

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">Sequence-level</span>
          <h2 className="section-title">Office Expenses</h2>
          <p className="subtle-copy" style={{ marginTop: 6 }}>
            Each entry is split equally across this sequence&apos;s{" "}
            <strong>{sequenceTotalProjects}</strong> projects (1/
            {sequenceTotalProjects} ={" "}
            {((1 / sequenceTotalProjects) * 100).toFixed(0)}% each).
            Per-item budgets enforce caps — see{" "}
            <strong>Admin → Office Expenses</strong>.
          </p>
        </div>
      </div>

      <div className="module-grid" style={{ gap: 16 }}>
        {/* ── Add entry form ── */}
        <section className="section-card">
          <div className="section-head">
            <div>
              <span className="eyebrow" style={{ color: "#c4b5fd" }}>
                Record entry
              </span>
              <h3 className="section-title" style={{ fontSize: "1rem" }}>
                Log an office expense
              </h3>
            </div>
          </div>
          <form action={recordOfficeExpenseAction} className="form-grid">
            <input type="hidden" name="sequence_id" value={sequenceId} />
            <label className="space-y-2" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">Item</span>
              <Select
                name="item_id"
                value={itemId || ""}
                onChange={(e) => setItemId(Number(e.target.value))}
                required
              >
                {!items.length && <option value="">No items configured</option>}
                {monthlyItems.length > 0 && (
                  <optgroup label="Monthly">
                    {monthlyItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (default TZS {fmtTZS(Number(i.defaultAmount))}/mo)
                      </option>
                    ))}
                  </optgroup>
                )}
                {yearlyItems.length > 0 && (
                  <optgroup label="Yearly">
                    {yearlyItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (default TZS {fmtTZS(Number(i.defaultAmount))}/yr)
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Amount (TZS)</span>
              <Input
                name="amount"
                type="number"
                placeholder="e.g. 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Date</span>
              <Input
                name="expense_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="space-y-2" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">Note (optional)</span>
              <Input name="note" placeholder="reference / vendor / details" />
            </label>
            {selectedItem && periodInfo && (
              <div className="helper-panel" style={{ gridColumn: "1 / -1" }}>
                <strong>{selectedItem.name}</strong> · {periodInfo.label} ·{" "}
                Default cap: <strong>TZS {fmtTZS(periodInfo.cap)}</strong> ·{" "}
                Spent this period: <strong>TZS {fmtTZS(periodInfo.spent)}</strong>
                <br />
                Live retained (vs default): <strong>TZS {fmtTZS(periodInfo.retained)}</strong>{" "}
                <span style={{ opacity: 0.7 }}>
                  — actual cap may differ if admin overrode it; the server
                  enforces the real budget on save.
                </span>
              </div>
            )}
            <div className="button-row" style={{ gridColumn: "1 / -1" }}>
              <Button type="submit">Record expense</Button>
            </div>
          </form>
        </section>

        {/* ── Existing entries ── */}
        <section className="section-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Recorded entries</span>
              <h3 className="section-title" style={{ fontSize: "1rem" }}>
                This sequence ({entries.length})
              </h3>
            </div>
          </div>
          {entries.length === 0 ? (
            <div className="empty-state">No office expenses recorded yet.</div>
          ) : (
            <div className="record-table-wrapper">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Recurrence</th>
                    <th>Amount</th>
                    <th>Per-project share</th>
                    <th>Note</th>
                    {canDelete && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const share = Number(e.amount) / sequenceTotalProjects;
                    return (
                      <tr key={e.id}>
                        <td data-label="Date">{String(e.expenseDate ?? "").slice(0, 10)}</td>
                        <td data-label="Item">{e.itemName}</td>
                        <td data-label="Recurrence">{e.recurrence}</td>
                        <td data-label="Amount">TZS {fmtTZS(Number(e.amount))}</td>
                        <td data-label="Per-project share">TZS {fmtTZS(share)}</td>
                        <td data-label="Note">{e.note || "—"}</td>
                        {canDelete && (
                          <td data-label="Actions" style={{ textAlign: "right" }}>
                            <form
                              action={deleteOfficeExpenseAction}
                              style={{ display: "inline" }}
                            >
                              <input type="hidden" name="id" value={e.id} />
                              <input
                                type="hidden"
                                name="sequence_id"
                                value={sequenceId}
                              />
                              <ConfirmSubmit
                                message="Delete this office expense?"
                                ariaLabel="Delete office expense"
                                title="Delete"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card/95 text-destructive shadow-sm transition hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/10"
                              >
                                <Trash2 size={14} />
                              </ConfirmSubmit>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
