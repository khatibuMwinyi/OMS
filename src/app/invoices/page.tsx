import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { InvoiceItemsField } from "@/components/invoice-items-field";
import { InvoicePaymentFields } from "@/components/invoice-payment-fields";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getInvoiceDocument,
  getNextInvoiceNumber,
  listInvoices,
} from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { FIXED_TIN_NUMBER } from "@/lib/payment-defaults";
import { getCurrentSession } from "@/lib/session-server";

import { createInvoiceAction, updateInvoiceAction } from "../actions/records";

function formatTZS(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    edit?: string;
    period?: string;
    date?: string;
    month?: string;
    week?: string;
  }>;
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const reportPeriod = normalizeReportPeriod(resolvedSearchParams.period);
  const reportContext = {
    date: resolvedSearchParams.date ?? null,
    month: resolvedSearchParams.month ?? null,
    week: resolvedSearchParams.week ?? null,
  };

  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;

  const editDocument = isEditing
    ? await getInvoiceDocument(session, editId)
    : null;
  if (isEditing && !editDocument) {
    redirect("/invoices?error=Invoice%20not%20found.");
  }

  const nextInvoiceNumber = isEditing
    ? (editDocument?.invoice.invoiceNumber ?? "")
    : await getNextInvoiceNumber();

  const invoices = await listInvoices(
    session,
    1000,
    reportPeriod,
    reportContext,
  );
  const invoiceSummaries = new Map(
    invoices.map((item) => [
      item.id,
      [
        `Invoice ${item.invoiceNumber}`,
        `Customer: ${item.customerName}`,
        `Date: ${formatDate(item.invoiceDate)}`,
        `Amount: ${formatTZS(Number(item.grandTotal ?? 0))}`,
      ].join("\n"),
    ]),
  );

  const initialRows = editDocument
    ? editDocument.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      }))
    : undefined;

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/invoices" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Revenue</span>
            <h1 className="page-title">Invoices</h1>
            <p className="subtle-copy">
              Create and manage invoice records for customer transactions.
            </p>
          </div>
        </section>

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        <section className="module-grid module-grid--single">
          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  {isEditing ? "Edit invoice" : "Create invoice"}
                </span>
                <h2 className="section-title">Invoice details</h2>
              </div>
            </div>

            <form
              action={isEditing ? updateInvoiceAction : createInvoiceAction}
              className="form-grid form-grid--wide"
            >
              {isEditing && editDocument ? (
                <input
                  name="invoice_id"
                  type="hidden"
                  value={editDocument.invoice.id}
                  readOnly
                />
              ) : null}
              <label className="space-y-2">
                <span className="field-label">Invoice number</span>
                <Input
                  name="invoice_number"
                  defaultValue={nextInvoiceNumber}
                  readOnly={!isEditing}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">TIN</span>
                <Input
                  name="tin"
                  defaultValue={FIXED_TIN_NUMBER}
                  readOnly
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">Invoice date</span>
                <Input
                  name="invoice_date"
                  type="date"
                  defaultValue={editDocument?.invoice.invoiceDate ?? ""}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">Customer name</span>
                <Input
                  name="director"
                  defaultValue={editDocument?.invoice.customerName ?? ""}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">Phone</span>
                <Input
                  name="phone"
                  defaultValue={editDocument?.invoice.phone ?? ""}
                  required
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="field-label">VAT (optional)</span>
                <Input
                  name="vat"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    editDocument?.invoice.vat
                      ? String(editDocument.invoice.vat)
                      : ""
                  }
                  placeholder="Leave blank if not applicable"
                />
              </label>

              <div className="md:col-span-2 overflow-hidden rounded-3xl border border-border bg-white">
                <div className="border-b border-border/70 px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Payment information
                  </h3>
                </div>

                <div className="space-y-0 p-5">
                  <InvoicePaymentFields
                    defaultBankAccount={editDocument?.invoice.bankAccount ?? ""}
                    defaultBankName={editDocument?.invoice.bankName ?? ""}
                    defaultHolderName={editDocument?.invoice.holderName ?? ""}
                    defaultMobileHolder={
                      editDocument?.invoice.mobileHolder ?? ""
                    }
                    defaultMobileNumber={
                      editDocument?.invoice.mobileNumber ?? ""
                    }
                    defaultMobileOperator={
                      editDocument?.invoice.mobileOperator ?? ""
                    }
                    defaultPaymentMethod={
                      editDocument?.invoice.paymentMethod ?? "Cash"
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <InvoiceItemsField
                  key={
                    editDocument
                      ? `invoice-${editDocument.invoice.id}`
                      : "invoice-new"
                  }
                  initialRows={initialRows}
                />
              </div>

              <div className="button-row md:col-span-2">
                <Button type="submit">
                  {isEditing ? "Update invoice" : "Save invoice"}
                </Button>
              </div>
            </form>
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent invoices</span>
                <h2 className="section-title">Latest invoice records</h2>
              </div>
            </div>

            <ReportPeriodTabs
              basePath="/invoices"
              value={reportPeriod}
              date={resolvedSearchParams.date ?? ""}
              month={resolvedSearchParams.month ?? ""}
              week={resolvedSearchParams.week ?? ""}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
            />

            <RecentRecords
              title="Invoices"
              emptyText="No invoice records found yet."
              columns={{
                record: "Invoice",
                details: "Customer",
                value: "Amount",
              }}
              getShareMessage={(item, downloadUrl) => {
                const summary =
                  invoiceSummaries.get(item.id) ?? `Invoice ${item.title}`;
                return downloadUrl
                  ? `${summary}\nDownload PDF: ${downloadUrl}`
                  : summary;
              }}
              getEditHref={(item) => `/invoices?edit=${item.id}`}
              getDownloadHref={(item) => `/api/export/invoice/${item.id}`}
              items={invoices.map((item) => ({
                id: item.id,
                title: item.invoiceNumber,
                subtitle: `${item.customerName} · ${formatDate(item.invoiceDate)}`,
                value: formatTZS(Number(item.grandTotal ?? 0)),
              }))}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
