"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  createOfficeExpenseItemAction,
  updateOfficeExpenseItemAction,
  deleteOfficeExpenseItemAction,
} from "@/app/actions/projects";
import type { OfficeExpenseItem } from "@/lib/projects";

function fmtTZS(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.round(n));
}

type Props = {
  items: OfficeExpenseItem[];
  canEdit: boolean;
};

export function OfficeItemsPanel({ items, canEdit }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Filter state: default to "all"
  const [currentFilter, setCurrentFilter] = useState<"all" | "monthly" | "yearly">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Page size: 5 for "all", 10 for specific filters
  const pageSize = currentFilter === "all" ? 5 : 10;

  // Filter items in-memory (no server call)
  const filteredItems = useMemo(() => {
    if (currentFilter === "all") return items;
    return items.filter(i => i.recurrence === currentFilter);
  }, [items, currentFilter]);

  // Paginate filtered items
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Separate monthly and yearly for display within current page
  const monthlyItems = paginatedItems.filter(i => i.recurrence === "monthly");
  const yearlyItems = paginatedItems.filter(i => i.recurrence === "yearly");

  const editingItem = editId ? items.find(i => i.id === editId) : null;

  // Reset page when filter changes
  function handleFilterChange(newFilter: "all" | "monthly" | "yearly") {
    setCurrentFilter(newFilter);
    setCurrentPage(1);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">Master Items</span>
          <h2 className="section-title">Office Budget Items</h2>
          <p className="subtle-copy" style={{ marginTop: 6 }}>
            Default amounts for monthly and yearly office expenses. These feed into Annual Office Burden calculations.
          </p>
        </div>
        {canEdit && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Item
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showForm || editId) && (
        <section className="section-card form-card" style={{ marginBottom: 16 }}>
          <form
            action={async (formData) => {
              if (editId) {
                await updateOfficeExpenseItemAction(formData);
              } else {
                await createOfficeExpenseItemAction(formData);
              }
              setShowForm(false);
              setEditId(null);
            }}
            className="form-grid"
          >
            {editId && <input type="hidden" name="id" value={editId} />}
            <label className="space-y-2">
              <span className="field-label">Name</span>
              <Input
                name="name"
                defaultValue={editingItem?.name}
                placeholder="e.g. Internet"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Recurrence</span>
              <Select name="recurrence" defaultValue={editingItem?.recurrence ?? "monthly"}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Default Amount (TZS)</span>
              <Input
                name="default_amount"
                type="number"
                defaultValue={editingItem ? Number(editingItem.defaultAmount) : undefined}
                placeholder="e.g. 100000"
                required
              />
            </label>
            <div className="button-row">
              <Button type="submit">{editId ? "Update" : "Add"} Item</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Filter buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div className="pill-group">
          <button
            type="button"
            className={`pill${currentFilter === "all" ? " pill--gold" : ""}`}
            onClick={() => handleFilterChange("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`pill${currentFilter === "monthly" ? " pill--gold" : ""}`}
            onClick={() => handleFilterChange("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`pill${currentFilter === "yearly" ? " pill--gold" : ""}`}
            onClick={() => handleFilterChange("yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Items Table */}
      <section className="section-card">
        {items.length === 0 ? (
          <div className="empty-state">No office items configured.</div>
        ) : (
          <div className="record-table-wrapper">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Recurrence</th>
                  <th>Default Amount</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {monthlyItems.length > 0 && (
                  <>
                    <tr className="section-row">
                      <td colSpan={4} style={{ fontWeight: 600, background: "var(--bg-muted)" }}>
                        Monthly ({monthlyItems.length})
                      </td>
                    </tr>
                    {monthlyItems.map(item => (
                      <tr key={item.id}>
                        <td data-label="Name">{item.name}</td>
                        <td data-label="Recurrence">
                          <span className="badge badge-blue">Monthly</span>
                        </td>
                        <td data-label="Default">TZS {fmtTZS(Number(item.defaultAmount))}</td>
                        {canEdit && (
                          <td data-label="Actions" style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditId(item.id)}>
                                <Pencil size={14} />
                              </Button>
                              <form action={deleteOfficeExpenseItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <ConfirmSubmit message="Delete this item?" title="Delete">
                                  <Trash2 size={14} />
                                </ConfirmSubmit>
                              </form>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
                {yearlyItems.length > 0 && (
                  <>
                    <tr className="section-row">
                      <td colSpan={4} style={{ fontWeight: 600, background: "var(--bg-muted)" }}>
                        Yearly ({yearlyItems.length})
                      </td>
                    </tr>
                    {yearlyItems.map(item => (
                      <tr key={item.id}>
                        <td data-label="Name">{item.name}</td>
                        <td data-label="Recurrence">
                          <span className="badge badge-purple">Yearly</span>
                        </td>
                        <td data-label="Default">TZS {fmtTZS(Number(item.defaultAmount))}</td>
                        {canEdit && (
                          <td data-label="Actions" style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditId(item.id)}>
                                <Pencil size={14} />
                              </Button>
                              <form action={deleteOfficeExpenseItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <ConfirmSubmit message="Delete this item?" title="Delete">
                                  <Trash2 size={14} />
                                </ConfirmSubmit>
                              </form>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 16 }}>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}