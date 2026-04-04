'use client';

import { useState } from "react";

import { LegacySelectionFields } from "@/components/legacy-selection-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { legacyVoucherRecords, type LegacySelectionRecord } from "@/lib/legacy-form-data";
import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
  FIXED_MOBILE_HOLDER_NAME,
  FIXED_MOBILE_NUMBER,
} from "@/lib/payment-defaults";

type VoucherFormFieldsProps = {
  voucherNumber: string;
  templates?: LegacySelectionRecord[];
};

export function VoucherFormFields({ templates, voucherNumber }: VoucherFormFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const mergedRecords = [...legacyVoucherRecords, ...(templates ?? [])].filter(
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
        <Input name="voucher_number" defaultValue={voucherNumber} readOnly required />
      </label>
      <label className="space-y-2">
        <span className="field-label">Date</span>
        <Input name="date" type="date" required />
      </label>
      <label className="space-y-2">
        <span className="field-label">Customer name</span>
        <Input name="customer_name" required />
      </label>

      <fieldset className="space-y-3 md:col-span-2">
        <span className="field-label">Payment method</span>
        <div className="flex flex-wrap gap-4">
          {[
            "Cash",
            "Bank Transfer",
            "Mobile Transaction",
          ].map((method) => (
            <label className="flex items-center gap-2 text-sm text-slate-700" key={method}>
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
        <div className="md:col-span-2 grid gap-3 rounded-3xl border border-border bg-slate-50 p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">Bank name</span>
            <Input name="bank_name" defaultValue={FIXED_BANK_NAME} readOnly required />
          </label>
          <label className="space-y-2">
            <span className="field-label">Account number</span>
            <Input
              name="account_number"
              defaultValue={FIXED_BANK_ACCOUNT_NUMBER}
              readOnly
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Account name</span>
            <Input
              name="account_name"
              defaultValue={FIXED_BANK_ACCOUNT_NAME}
              readOnly
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Reference number</span>
            <Input name="bank_reference" required />
          </label>
        </div>
      ) : null}

      {paymentMethod === "Mobile Transaction" ? (
        <div className="md:col-span-2 grid gap-3 rounded-3xl border border-border bg-slate-50 p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">Mobile number</span>
            <Input
              name="mobile_number"
              defaultValue={FIXED_MOBILE_NUMBER}
              readOnly
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Payer name</span>
            <Input
              name="payer_name"
              defaultValue={FIXED_MOBILE_HOLDER_NAME}
              readOnly
              required
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="field-label">Reference number</span>
            <Input name="mobile_reference" required />
          </label>
        </div>
      ) : null}

      <LegacySelectionFields records={mergedRecords} defaultType="Expense" />
    </>
  );
}