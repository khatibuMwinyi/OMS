"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InvoiceRow = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceItemInput = {
  description: string;
  quantity: string;
  unitPrice: string;
};

function createRow(): InvoiceRow {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

function asNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTZS(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(value)}`;
}

type InvoiceItemsFieldProps = {
  initialRows?: InvoiceItemInput[];
};

export function InvoiceItemsField({ initialRows }: InvoiceItemsFieldProps) {
  const [rows, setRows] = useState<InvoiceRow[]>(() => {
    if (!initialRows?.length) {
      return [createRow()];
    }

    return initialRows.map((row) => ({
      id: crypto.randomUUID(),
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    }));
  });

  const serializedItems = rows
    .map((row) => {
      const description = row.description.trim();
      if (!description) {
        return "";
      }

      const quantity = Math.max(1, Math.trunc(asNumber(row.quantity)) || 1);
      const unitPrice = Math.max(0, asNumber(row.unitPrice));
      return `${description}|${quantity}|${unitPrice}`;
    })
    .filter(Boolean)
    .join("\n");

  const subtotal = rows.reduce((sum, row) => {
    const quantity = Math.max(1, Math.trunc(asNumber(row.quantity)) || 1);
    const unitPrice = Math.max(0, asNumber(row.unitPrice));
    return sum + quantity * unitPrice;
  }, 0);

  const updateRow = (
    id: string,
    field: keyof Omit<InvoiceRow, "id">,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, createRow()]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  };

  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <input name="items" type="hidden" value={serializedItems} readOnly />

      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="field-label mb-1">Invoice items</span>
          <p className="helper-text mt-0">
            Add each service or product as a separate row.
          </p>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus size={16} />
          Add row
        </Button>
      </div>

      <div className="mt-4 record-table-wrapper">
        <table className="record-table record-table--editor">
          <thead>
            <tr className="border-b border-border/70">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Description
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Qty
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Unit price
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Line total
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const quantity = Math.max(1, Math.trunc(asNumber(row.quantity)) || 1);
              const unitPrice = Math.max(0, asNumber(row.unitPrice));
              const lineTotal = quantity * unitPrice;

              return (
                <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                  <td data-label="Description" className="px-3 py-3 align-top">
                    <Input
                      value={row.description}
                      onChange={(event) => updateRow(row.id, "description", event.target.value)}
                      placeholder="Service description"
                      required
                    />
                  </td>
                  <td data-label="Qty" className="px-3 py-3 align-top sm:w-[110px]">
                    <Input
                      value={row.quantity}
                      onChange={(event) => updateRow(row.id, "quantity", event.target.value)}
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                  </td>
                  <td data-label="Unit price" className="px-3 py-3 align-top sm:w-[180px]">
                    <Input
                      value={row.unitPrice}
                      onChange={(event) => updateRow(row.id, "unitPrice", event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td data-label="Line total" className="px-3 py-3 align-top text-right text-sm font-semibold text-slate-900">
                    {formatTZS(lineTotal)}
                  </td>
                  <td data-label="Action" className="px-3 py-3 align-top text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Totals are calculated from the entered rows and saved in the existing invoice item format.
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-900">
          <span>Subtotal: {formatTZS(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}