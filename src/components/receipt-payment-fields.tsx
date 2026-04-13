'use client';

import { useState } from "react";

import { RecordFieldRow } from "@/components/record-field-row";
import { Input } from "@/components/ui/input";
import { FIXED_BANK_NAME } from "@/lib/payment-defaults";

type ReceiptPaymentFieldsProps = {
  defaultPaymentMethod?: string | null;
  defaultBankName?: string | null;
  defaultReferenceNumber?: string | null;
};

export function ReceiptPaymentFields({
  defaultPaymentMethod,
  defaultBankName,
  defaultReferenceNumber,
}: ReceiptPaymentFieldsProps) {
  const [paymentMethod, setPaymentMethod] = useState(
    defaultPaymentMethod === "Bank Transfer" ? "Bank Transfer" : "Cash",
  );

  return (
    <>
      <RecordFieldRow label="Payment method">
        <div className="flex flex-wrap gap-4 pt-1">
          {["Cash", "Bank Transfer"].map((method) => (
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
              // Editable input for bank name
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
    </>
  );
}