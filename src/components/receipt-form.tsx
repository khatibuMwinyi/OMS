"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LegacySelectionFields } from "@/components/legacy-selection-fields";
import { RecordFieldRow } from "@/components/record-field-row";
import { ReceiptPaymentFields } from "@/components/receipt-payment-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { legacyReceiptRecords } from "@/lib/legacy-form-data";
import {
  createReceiptAction,
  updateReceiptAction,
} from "@/app/actions/records";

type ReceiptFormDocument = {
  id: number;
  receiptNumber: string;
  receiptDate: string | null;
  customerName: string | null;
  amount: number | string | null;
  phone: string | null;
  code: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  referenceNumber: string | null;
};

type ReceiptFormProps = {
  isEditing: boolean;
  nextReceiptNumber: string;
  document: ReceiptFormDocument | null;
};

type ReceiptFormState = {
  status?: string;
  error?: string;
  token?: string;
};

const initialState: ReceiptFormState = {};

export function ReceiptForm({
  isEditing,
  nextReceiptNumber,
  document,
}: ReceiptFormProps) {
  const router = useRouter();
  const lastHandledResult = useRef("");
  const [submissionState, formAction, isPending] = useActionState<
    ReceiptFormState,
    FormData
  >(isEditing ? updateReceiptAction : createReceiptAction, initialState);

  useEffect(() => {
    const resultKey = submissionState.token
      ? submissionState.error
        ? `error:${submissionState.token}`
        : `status:${submissionState.token}`
      : "";

    if (!resultKey || lastHandledResult.current === resultKey) {
      return;
    }

    lastHandledResult.current = resultKey;

    if (submissionState.error) {
      toast.error(submissionState.error);
      return;
    }

    if (submissionState.status) {
      toast.success(submissionState.status);
      router.refresh();
    }
  }, [
    router,
    submissionState.error,
    submissionState.status,
    submissionState.token,
  ]);

  const formKey = isEditing
    ? `receipt-edit-${document?.id ?? "new"}`
    : `receipt-create-${nextReceiptNumber}`;

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <input name="__async" type="hidden" value="1" readOnly />
      {isEditing && document ? (
        <input name="receipt_id" type="hidden" value={document.id} readOnly />
      ) : null}
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
          <div className="border-b border-border/85 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Receipt identity
            </h3>
          </div>

          <RecordFieldRow label="Receipt number">
            <Input
              name="receipt_number"
              defaultValue={
                isEditing ? (document?.receiptNumber ?? "") : nextReceiptNumber
              }
              readOnly={!isEditing}
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Receipt date">
            <Input
              name="receipt_date"
              type="date"
              defaultValue={document?.receiptDate ?? ""}
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Customer name">
            <Input
              name="customer_name"
              defaultValue={document?.customerName ?? ""}
              required
            />
          </RecordFieldRow>
          <RecordFieldRow label="Amount paid">
            <Input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={document?.amount ?? ""}
              required
            />
          </RecordFieldRow>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
          <div className="border-b border-border/85 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Receipt details
            </h3>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <LegacySelectionFields
              records={legacyReceiptRecords}
              defaultType={document?.type ?? "Revenue"}
              defaultCategory={document?.category ?? undefined}
              defaultCode={document?.code ?? undefined}
              defaultDescription={document?.description ?? undefined}
              showAmount={false}
            />
            <label className="space-y-2 lg:col-span-2">
              <span className="field-label">Customer phone</span>
              <Input name="phone" defaultValue={document?.phone ?? ""} />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
          <div className="border-b border-border/85 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Payment information
            </h3>
          </div>

          <ReceiptPaymentFields
            defaultBankName={document?.bankName ?? ""}
            defaultPaymentMethod={document?.paymentMethod ?? "Cash"}
            defaultReferenceNumber={document?.referenceNumber ?? ""}
          />
        </div>

        <div className="button-row">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update receipt"
                : "Create receipt"}
          </Button>
        </div>
      </div>
    </form>
  );
}
