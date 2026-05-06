import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { LegacySelectionFields } from "@/components/legacy-selection-fields";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { legacyPettyCashRecords, type LegacySelectionRecord } from "@/lib/legacy-form-data";
import { getNextPettyCashNumber, listPettyCash } from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCategoriesWithFallback } from "@/lib/categories";
import { getCurrentSession } from "@/lib/session-server";

import {
  createPettyCashAction,
  deletePettyCashAction,
} from "../actions/records";

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

function renderPettyCashStatus(status: string) {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "pending") {
    return (
      <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
        Pending
      </Badge>
    );
  }
  if (normalizedStatus === "approved") {
    return (
      <Badge variant="success" className="px-2 py-0.5 text-[10px]">
        Approved
      </Badge>
    );
  }
  if (normalizedStatus === "rejected") {
    return (
      <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
      {status}
    </Badge>
  );
}

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    period?: string;
    date?: string;
    month?: string;
    week?: string;
  }>;
};

export default async function PettyCashPage({ searchParams }: PageProps) {
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

  const nextPettyCashNumber = await getNextPettyCashNumber();
  const categories = await getCategoriesWithFallback("petty_cash");
  const pettyCashRecords: LegacySelectionRecord[] = categories.map(cat => ({
    type: cat.type || "Expense",
    category: cat.category,
    code: cat.code,
    description: cat.description || "",
  }));

  const pettyCashHistory = await listPettyCash(
    session,
    1000,
    reportPeriod,
    reportContext,
  );
  const pettyCash = pettyCashHistory.slice(0, 20);

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/petty-cash" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Expenses</span>
            <h1 className="page-title">Petty cash voucher</h1>
            <p className="subtle-copy">
              Track small operating expenses as petty cash vouchers against the
              same existing database.
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
                <span className="eyebrow">Create expense</span>
                <h2 className="section-title">Petty cash voucher entry</h2>
              </div>
            </div>

            <form
              action={createPettyCashAction}
              className="form-grid form-grid--wide"
            >
              <label className="space-y-2">
                <span className="field-label">Date</span>
                <Input name="date" type="date" required />
              </label>
              <LegacySelectionFields
                records={pettyCashRecords}
                defaultType="Expense"
                showAmount={false}
              />
              <label className="space-y-2">
                <span className="field-label">Amount</span>
                <Input name="amount" type="number" step="0.01" required />
              </label>
              <label className="space-y-2">
                <span className="field-label">Petty cash voucher number</span>
                <Input
                  name="pettycash_number"
                  defaultValue={nextPettyCashNumber}
                  readOnly
                />
              </label>
              <label className="space-y-2">
                <span className="field-label">Reference number</span>
                <Input name="reference_number" />
              </label>
              <div className="button-row lg:col-span-2">
                <Button type="submit">Create petty cash voucher</Button>
              </div>
            </form>
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent petty cash vouchers</span>
                <h2 className="section-title">Latest expense entries</h2>
              </div>
            </div>

            <ReportPeriodTabs
              basePath="/petty-cash"
              value={reportPeriod}
              date={resolvedSearchParams.date ?? ""}
              month={resolvedSearchParams.month ?? ""}
              week={resolvedSearchParams.week ?? ""}
              downloadOptions={[
                {
                  label: "Download petty cash report",
                  href: "/api/export/report/petty-cash",
                },
              ]}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
            />

            <RecentRecords
              title="Petty cash vouchers"
              emptyText="No petty cash voucher records found yet."
              columns={{
                record: "Entry",
                details: "Description",
                value: "Amount",
              }}
              getDownloadHref={(item) =>
                `/api/export/petty-cash-voucher/${item.id}`
              }
              deleteAction={deletePettyCashAction}
              canDelete={session.role === "admin" || session.role === "director"}
              deleteConfirmMessage="Delete this petty cash record? This action cannot be undone."
              items={pettyCash.map((item) => ({
                id: item.id,
                title: item.code || item.referenceNumber || item.description,
                subtitle: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{item.description}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{item.category}</span>
                    <span aria-hidden="true">&middot;</span>
                    {renderPettyCashStatus(item.status)}
                    <span aria-hidden="true">&middot;</span>
                    <span>{formatDate(item.date)}</span>
                  </span>
                ),
                value: formatTZS(Number(item.amount ?? 0)),
              }))}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
