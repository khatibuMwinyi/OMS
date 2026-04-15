"use client";

import { useState } from "react";

import { LegacySelectionFields } from "@/components/legacy-selection-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  legacyVoucherRecords,
  type LegacySelectionRecord,
} from "@/lib/legacy-form-data";
import type { CategoryRecord } from "@/lib/categories";

type VoucherFormFieldsProps = {
  categories?: CategoryRecord[];
  voucherNumber?: string;
  templates?: LegacySelectionRecord[];
  defaultDate?: string | null;
  defaultCustomerName?: string | null;
  defaultPaymentMethod?: string | null;
  defaultBankName?: string | null;
  defaultAccountNumber?: string | null;
  defaultAccountName?: string | null;
  defaultBankReference?: string | null;
  defaultMobileNumber?: string | null;
  defaultPayerName?: string | null;
  defaultMobileReference?: string | null;
  defaultType?: string | null;
  defaultCategory?: string | null;
  defaultCode?: string | null;
  defaultDescription?: string | null;
  defaultAmount?: number | null;
};

export function VoucherFormFields({
  categories,
  voucherNumber,
  templates,
  defaultDate,
  defaultCustomerName,
  defaultPaymentMethod,
  defaultBankName,
  defaultAccountNumber,
  defaultAccountName,
  defaultBankReference,
  defaultMobileNumber,
  defaultPayerName,
  defaultMobileReference,
  defaultType,
  defaultCategory,
  defaultCode,
  defaultDescription,
  defaultAmount,
}: VoucherFormFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState(
    defaultPaymentMethod === "Bank Transfer" ||
      defaultPaymentMethod === "Mobile Transaction" ||
      defaultPaymentMethod === "Cash"
      ? defaultPaymentMethod
      : "Cash",
  );

  const records: LegacySelectionRecord[] = categories?.map(cat => ({
    type: cat.type || "",
    category: cat.category,
    code: cat.code,
    description: cat.description || "",
  })) ?? legacyVoucherRecords;

  const mergedRecords = [...legacyVoucherRecords, ...records].filter(
    (record, index, allRecords) =>
      index ===
      allRecords.findIndex(
        (entry) =>
          entry.type === record.type &&
          entry.category === record.category &&
          entry.code === record.code &&
          entry.description === record.description,
      ),
  );

  return (
    <>
      <label className="space-y-2">
        <span className="field-label">Voucher number</span>
        <Input
          name="voucher_number"
          defaultValue={voucherNumber}
          readOnly
          required
        />
      </label>
      <label className="space-y-2">
        <span className="field-label">Date</span>
        <Input name="date" type="date" defaultValue={defaultDate ?? ""} required />
      </label>
      <label className="space-y-2">
        <span className="field-label">Customer name</span>
        <Input name="customer_name" defaultValue={defaultCustomerName ?? ""} required />
      </label>

      <fieldset className="space-y-3 lg:col-span-2">
        <span className="field-label">Payment method</span>
        <div className="flex flex-wrap gap-4">
          {["Cash", "Bank Transfer", "Mobile Transaction"].map((method) => (
            <label
              className="flex items-center gap-2 text-sm text-foreground/85"
              key={method}
            >
              <input
                checked={paymentMethod === method}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                name="payment_method"
                onChange={() => setPaymentMethod(method)}
                type="radio"
                value={method}
              />
              {method}
            </label>
          ))}
        </div>
      </fieldset>

      {paymentMethod === "Bank Transfer" ? (
        <div className="lg:col-span-2 grid gap-3 rounded-3xl border border-border bg-white/5 p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">Beneficiary bank name</span>
            <Input
              name="bank_name"
              defaultValue={defaultBankName ?? ""}
              placeholder="e.g. NMB"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Beneficiary account number</span>
            <Input
              name="account_number"
              defaultValue={defaultAccountNumber ?? ""}
              placeholder="e.g. 0123456789"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Beneficiary account name</span>
            <Input
              name="account_name"
              defaultValue={defaultAccountName ?? ""}
              placeholder="e.g. John Doe"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Reference number</span>
            <Input
              name="bank_reference"
              defaultValue={defaultBankReference ?? ""}
              required
            />
          </label>
        </div>
      ) : null}

      {paymentMethod === "Mobile Transaction" ? (
        <div className="lg:col-span-2 grid gap-3 rounded-3xl border border-border bg-white/5 p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">Beneficiary mobile number</span>
            <Input
              name="mobile_number"
              defaultValue={defaultMobileNumber ?? ""}
              placeholder="e.g. 07XXXXXXXX"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Beneficiary name</span>
            <Input
              name="payer_name"
              defaultValue={defaultPayerName ?? ""}
              placeholder="e.g. Jane Doe"
              required
            />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="field-label">Reference number</span>
            <Input
              name="mobile_reference"
              defaultValue={defaultMobileReference ?? ""}
              required
            />
          </label>
        </div>
      ) : null}

      <LegacySelectionFields
        records={mergedRecords}
        defaultType={defaultType ?? "Expense"}
        defaultCategory={defaultCategory ?? undefined}
        defaultCode={defaultCode ?? undefined}
        defaultDescription={defaultDescription ?? undefined}
        defaultAmount={defaultAmount ?? undefined}
      />
    </>
  );
}
