"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  legacyReceiptRecords,
  type LegacySelectionRecord,
} from "@/lib/legacy-form-data";

type ReceiptRow = {
  id: string;
  category: string;
  description: string;
  location: string;
  quantity: string;
  unitPrice: string;
};

type ReceiptItemInput = {
  category?: string | null;
  description: string;
  location?: string | null;
  quantity: string;
  unitPrice: string;
};

const REVENUE_RECORDS: LegacySelectionRecord[] = legacyReceiptRecords.filter(
  (record) => record.type === "Revenue",
);

const REVENUE_CATEGORIES = Array.from(
  new Set(REVENUE_RECORDS.map((record) => record.category)),
);

function descriptionsForCategory(category: string) {
  return Array.from(
    new Set(
      REVENUE_RECORDS.filter((record) => record.category === category).map(
        (record) => record.description,
      ),
    ),
  );
}

function createRow(): ReceiptRow {
  const category = REVENUE_CATEGORIES[0] ?? "";
  const description = descriptionsForCategory(category)[0] ?? "";
  return {
    id: crypto.randomUUID(),
    category,
    description,
    location: "",
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

function encodeField(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

type ReceiptItemsFieldProps = {
  initialRows?: ReceiptItemInput[];
};

export function ReceiptItemsField({ initialRows }: ReceiptItemsFieldProps) {
  const [rows, setRows] = useState<ReceiptRow[]>(() => {
    if (!initialRows?.length) {
      return [createRow()];
    }

    return initialRows.map((row) => {
      const category = row.category ?? REVENUE_CATEGORIES[0] ?? "";
      return {
        id: crypto.randomUUID(),
        category,
        description:
          row.description ?? descriptionsForCategory(category)[0] ?? "",
        location: row.location ?? "",
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      };
    });
  });

  const serializedItems = rows
    .map((row) => {
      const description = row.description.trim();
      if (!description) {
        return "";
      }

      const quantity = Math.max(1, Math.trunc(asNumber(row.quantity)) || 1);
      const unitPrice = Math.max(0, asNumber(row.unitPrice));
      return [
        encodeField(row.category.trim()),
        encodeField(description),
        encodeField(row.location.trim()),
        String(quantity),
        String(unitPrice),
      ].join("|");
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
    field: keyof Omit<ReceiptRow, "id">,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (field === "category") {
          const nextDescriptions = descriptionsForCategory(value);
          return {
            ...row,
            category: value,
            description: nextDescriptions[0] ?? "",
          };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, createRow()]);
  };

  const removeRow = (id: string) => {
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id),
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-white/5 p-4">
      <input name="receipt_items" type="hidden" value={serializedItems} readOnly />
      <input name="amount" type="hidden" value={String(subtotal)} readOnly />

      <div className="flex flex-col gap-3 border-b border-border/85 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="field-label mb-1">Receipt items</span>
          <p className="helper-text mt-0">
            Choose a category, then a description, and add a location for each
            row.
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
            <tr className="border-b border-border/85">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Category
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Description
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Location
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Qty
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Unit price
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Line total
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const quantity = Math.max(
                1,
                Math.trunc(asNumber(row.quantity)) || 1,
              );
              const unitPrice = Math.max(0, asNumber(row.unitPrice));
              const lineTotal = quantity * unitPrice;
              const descriptionOptions = descriptionsForCategory(row.category);

              return (
                <RowRender
                  key={row.id}
                  row={row}
                  descriptionOptions={descriptionOptions}
                  lineTotal={lineTotal}
                  removeDisabled={rows.length === 1}
                  onUpdate={updateRow}
                  onRemove={removeRow}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border/85 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Total amount paid is the sum of all rows above.
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-foreground">
          <span>Total: {formatTZS(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

type RowRenderProps = {
  row: ReceiptRow;
  descriptionOptions: string[];
  lineTotal: number;
  removeDisabled: boolean;
  onUpdate: (
    id: string,
    field: keyof Omit<ReceiptRow, "id">,
    value: string,
  ) => void;
  onRemove: (id: string) => void;
};

function RowRender({
  row,
  descriptionOptions,
  lineTotal,
  removeDisabled,
  onUpdate,
  onRemove,
}: RowRenderProps) {
  const descriptions = useMemo(
    () =>
      descriptionOptions.includes(row.description) || !row.description
        ? descriptionOptions
        : [row.description, ...descriptionOptions],
    [descriptionOptions, row.description],
  );

  return (
    <tr className="border-b border-border/75 last:border-b-0">
      <td data-label="Category" className="px-3 py-3 align-top sm:w-[200px]">
        <Select
          value={row.category}
          onChange={(event) => onUpdate(row.id, "category", event.target.value)}
          required
        >
          {REVENUE_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </td>
      <td data-label="Description" className="px-3 py-3 align-top">
        <Select
          value={row.description}
          onChange={(event) =>
            onUpdate(row.id, "description", event.target.value)
          }
          required
        >
          {descriptions.length === 0 ? (
            <option value="">No descriptions available</option>
          ) : null}
          {descriptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </td>
      <td data-label="Location" className="px-3 py-3 align-top sm:w-[180px]">
        <Input
          value={row.location}
          onChange={(event) => onUpdate(row.id, "location", event.target.value)}
          placeholder="e.g. Mbezi Beach"
        />
      </td>
      <td data-label="Qty" className="px-3 py-3 align-top sm:w-[100px]">
        <Input
          value={row.quantity}
          onChange={(event) => onUpdate(row.id, "quantity", event.target.value)}
          type="number"
          min="1"
          step="1"
          required
        />
      </td>
      <td data-label="Unit price" className="px-3 py-3 align-top sm:w-[160px]">
        <Input
          value={row.unitPrice}
          onChange={(event) =>
            onUpdate(row.id, "unitPrice", event.target.value)
          }
          type="number"
          min="0"
          step="0.01"
          required
        />
      </td>
      <td
        data-label="Line total"
        className="px-3 py-3 align-top text-right text-sm font-semibold text-foreground"
      >
        {formatTZS(lineTotal)}
      </td>
      <td data-label="Action" className="px-3 py-3 align-top text-right">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(row.id)}
          disabled={removeDisabled}
          aria-label="Remove row"
          title="Remove row"
        >
          <Trash2 size={14} />
        </Button>
      </td>
    </tr>
  );
}
