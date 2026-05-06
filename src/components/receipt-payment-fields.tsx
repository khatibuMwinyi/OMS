'use client';

import { useState } from "react";

import { RecordFieldRow } from "@/components/record-field-row";
import { Input } from "@/components/ui/input";
import {
  FIXED_BANK_ACCOUNT_NAME,
  FIXED_BANK_ACCOUNT_NUMBER,
  FIXED_BANK_NAME,
} from "@/lib/payment-defaults";

type ReceiptPaymentFieldsProps = {
  defaultPaymentMethod?: string | null;
  defaultBankName?: string | null;
  defaultReferenceNumber?: string | null;
  defaultDepositorName?: string | null;
};

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Bank Deposit"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function normalizeMethod(value: string | null | undefined): PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "Cash";
}

export function ReceiptPaymentFields({
  defaultPaymentMethod,
  defaultBankName,
  defaultReferenceNumber,
  defaultDepositorName,
}: ReceiptPaymentFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    normalizeMethod(defaultPaymentMethod),
  );

  return (
    <>
      <RecordFieldRow label="Payment method">
        <div className="flex flex-wrap gap-4 pt-1">
          {PAYMENT_METHODS.map((method) => (
            <label className="flex items-center gap-2 text-sm text-foreground/85" key={method}>
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
        <>
          <RecordFieldRow label="Bank name">
            <Input
              name="bank_name"
              defaultValue={defaultBankName ?? FIXED_BANK_NAME}
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Reference number">
            <Input
              name="reference_number"
              defaultValue={defaultReferenceNumber ?? ""}
              required
            />
          </RecordFieldRow>
        </>
      ) : null}

      {paymentMethod === "Bank Deposit" ? (
        <>
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
        </>
      ) : null}
    </>
  );
}
