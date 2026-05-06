"use client";

import { useState } from "react";

import { RecordFieldRow } from "@/components/record-field-row";
import { Input } from "@/components/ui/input";
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
  defaultDepositorName?: string | null;
};

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Mobile Money",
  "Bank Deposit",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function normalizeMethod(value: string | null | undefined): PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "Cash";
}

export function InvoicePaymentFields({
  defaultPaymentMethod,
  defaultBankName,
  defaultBankAccount: _defaultBankAccount,
  defaultHolderName: _defaultHolderName,
  defaultMobileNumber: _defaultMobileNumber,
  defaultMobileHolder: _defaultMobileHolder,
  defaultMobileOperator: _defaultMobileOperator,
  defaultDepositorName,
}: InvoicePaymentFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    normalizeMethod(defaultPaymentMethod),
  );

  return (
    <>
      <RecordFieldRow label="Payment method">
        <div className="flex flex-wrap gap-4 pt-1">
          {PAYMENT_METHODS.map((method) => (
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
      </RecordFieldRow>

      {paymentMethod === "Bank Transfer" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <RecordFieldRow label="Bank name">
            <Input
              name="bank_name"
              defaultValue={defaultBankName ?? FIXED_BANK_NAME}
              readOnly
              required
            />
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
        <div className="grid gap-4 lg:grid-cols-2">
          <RecordFieldRow label="Lipa Number">
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

      {paymentMethod === "Bank Deposit" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <RecordFieldRow label="Bank name">
            <Input
              name="bank_name"
              defaultValue={defaultBankName ?? FIXED_BANK_NAME}
              readOnly
              required
            />
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
          <RecordFieldRow label="Depositor name">
            <Input
              name="depositor_name"
              defaultValue={defaultDepositorName ?? ""}
              required
            />
          </RecordFieldRow>
        </div>
      ) : null}
    </>
  );
}
