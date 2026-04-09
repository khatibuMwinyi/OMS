import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RecentRecords } from "@/components/recent-records";
import { RouteToast } from "@/components/route-toast";
import { ReceiptForm } from "@/components/receipt-form";
import {
  getNextReceiptNumber,
  getReceiptDocument,
  listReceipts,
} from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCurrentSession } from "@/lib/session-server";

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

export default async function ReceiptsPage({ searchParams }: PageProps) {
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
    ? await getReceiptDocument(session, editId)
    : null;
  if (isEditing && !editDocument) {
    redirect("/receipts?error=Receipt%20not%20found.");
  }

  if (isEditing && editDocument?.sentAt) {
    redirect("/receipts?error=Sent%20receipts%20cannot%20be%20edited.");
  }

  const nextReceiptNumber = isEditing
    ? editDocument?.receiptNumber ?? ""
    : await getNextReceiptNumber();

  const receiptHistory = await listReceipts(
    session,
    1000,
    reportPeriod,
    reportContext,
  );
  const receipts = receiptHistory.slice(0, 20);
  const receiptSummaries = new Map(
    receipts.map((item) => [
      item.id,
      [
        `Receipt ${item.receiptNumber}`,
        `Customer: ${item.customerName}`,
        `Date: ${formatDate(item.receiptDate)}`,
        `Amount: ${formatTZS(Number(item.amount ?? 0))}`,
      ].join("\n"),
    ]),
  );

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/receipts" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Revenue</span>
            <h1 className="page-title">Receipts</h1>
            <p className="subtle-copy">
              Record incoming payments from customers and keep a complete
              history of all receipts.
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
                  {isEditing ? "Edit receipt" : "Create receipt"}
                </span>
                <h2 className="section-title">Receipt details</h2>
              </div>
            </div>
            <ReceiptForm
              isEditing={isEditing}
              nextReceiptNumber={nextReceiptNumber}
              document={editDocument}
            />
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent receipts</span>
                <h2 className="section-title">Latest receipt records</h2>
              </div>
            </div>

            <ReportPeriodTabs
              basePath="/receipts"
              value={reportPeriod}
              date={resolvedSearchParams.date ?? ""}
              month={resolvedSearchParams.month ?? ""}
              week={resolvedSearchParams.week ?? ""}
              downloadOptions={[
                {
                  label: "Download receipts report",
                  href: "/api/export/report/receipts",
                },
              ]}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
            />

            <RecentRecords
              title="Receipts"
              emptyText="No receipt records found yet."
              columns={{
                record: "Receipt",
                details: "Customer",
                value: "Amount",
              }}
              getShareDocument={(item) => {
                const source = receipts.find((record) => record.id === item.id);
                const summary =
                  receiptSummaries.get(item.id) ?? `Receipt ${item.title}`;

                return {
                  type: "receipt",
                  title: `Receipt ${item.title}`,
                  summary,
                  recipientPhone: source?.phone ?? null,
                };
              }}
              getEditHref={(item) => {
                const source = receipts.find((record) => record.id === item.id);
                if (!source || source.sentAt) {
                  return null;
                }

                return `/receipts?edit=${item.id}`;
              }}
              getDownloadHref={(item) => `/api/export/receipt/${item.id}`}
              items={receipts.map((item) => ({
                id: item.id,
                title: item.receiptNumber,
                subtitle: `${item.customerName} · ${formatDate(item.receiptDate)} · ${item.paymentMethod}${item.sentAt ? " · sent" : ""}`,
                value: formatTZS(Number(item.amount ?? 0)),
              }))}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
