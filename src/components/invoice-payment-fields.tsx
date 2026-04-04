"use client";

import { useState } from "react";

import { RecordFieldRow } from "@/components/record-field-row";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { tanzanianBankOptions } from "@/lib/bank-options";
import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
  FIXED_MOBILE_HOLDER_NAME,
  FIXED_MOBILE_NUMBER,
  FIXED_MOBILE_OPERATOR,
} from "@/lib/payment-defaults";

type InvoicePaymentFieldsProps = {
  defaultPaymentMethod?: string | null;
  defaultBankName?: string | null;
  defaultBankAccount?: string | null;
  defaultHolderName?: string | null;
  defaultMobileNumber?: string | null;
  defaultMobileHolder?: string | null;
  defaultMobileOperator?: string | null;
};

export function InvoicePaymentFields({
  defaultPaymentMethod,
  defaultBankName,
  defaultBankAccount,
  defaultHolderName,
  defaultMobileNumber,
  defaultMobileHolder,
  defaultMobileOperator,
}: InvoicePaymentFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState(
    defaultPaymentMethod === "Bank Transfer"
      ? "Bank Transfer"
      : defaultPaymentMethod === "Mobile Money"
        ? "Mobile Money"
        : "Cash",
  );

  return (
    <>
      <RecordFieldRow label="Payment method">
        <div className="flex flex-wrap gap-4 pt-1">
          {["Cash", "Bank Transfer", "Mobile Money"].map((method) => (
            <label
              className="flex items-center gap-2 text-sm text-slate-700"
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
      </RecordFieldRow>

      {paymentMethod === "Bank Transfer" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFieldRow label="Bank name">
            <Select
              name="bank_name"
              defaultValue={FIXED_BANK_NAME}
              required
            >
              {tanzanianBankOptions.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </Select>
          </RecordFieldRow>
          <RecordFieldRow label="Account number">
            <Input
              name="bank_account"
              defaultValue={FIXED_BANK_ACCOUNT_NUMBER}
              readOnly
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Account holder name">
            <Input
              name="holder_name"
              defaultValue={FIXED_BANK_ACCOUNT_NAME}
              readOnly
              required
            />
          </RecordFieldRow>
        </div>
      ) : null}

      {paymentMethod === "Mobile Money" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFieldRow label="Mobile number">
            <Input
              name="mobile_number"
              defaultValue={FIXED_MOBILE_NUMBER}
              readOnly
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Mobile holder name">
            <Input
              name="mobile_holder"
              defaultValue={FIXED_MOBILE_HOLDER_NAME}
              readOnly
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Mobile operator">
            <Input
              name="mobile_operator"
              defaultValue={FIXED_MOBILE_OPERATOR}
              readOnly
              required
            />
          </RecordFieldRow>
        </div>
      ) : null}
    </>
  );
}
