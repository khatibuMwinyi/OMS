import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RouteToast } from "@/components/route-toast";
import { ReportsPageClient } from "@/components/reports-page-client";
import {
  listInvoices,
  listLetters,
  listPettyCash,
  listReceipts,
  listVouchers,
} from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCurrentSession } from "@/lib/session-server";

export const REPORT_MODULES = [
  "invoices",
  "receipts",
  "petty-cash",
  "payment-vouchers",
  "letters",
] as const;

export type ReportModule = (typeof REPORT_MODULES)[number];

function normalizeModule(value: string | undefined): ReportModule {
  return REPORT_MODULES.includes(value as ReportModule)
    ? (value as ReportModule)
    : "invoices";
}

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect("/");

  const params = (await searchParams) ?? {};
  const activeModule = normalizeModule(params.module);
  const period = normalizeReportPeriod(params.period);
  const context = {
    date: params.date ?? null,
    month: params.month ?? null,
    week: params.week ?? null,
  };

  // Only fetch the active module's data to keep page load fast
  const [invoices, receipts, pettyCash, vouchers, letters] = await Promise.all([
    activeModule === "invoices"
      ? listInvoices(session, 1000, period, context)
      : Promise.resolve([]),
    activeModule === "receipts"
      ? listReceipts(session, 1000, period, context)
      : Promise.resolve([]),
    activeModule === "petty-cash"
      ? listPettyCash(session, 1000, period, context)
      : Promise.resolve([]),
    activeModule === "payment-vouchers"
      ? listVouchers(session, 1000, period, context)
      : Promise.resolve([]),
    activeModule === "letters"
      ? listLetters(session, 1000, period, context)
      : Promise.resolve([]),
  ]);

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/reports" />

      <div className="dashboard-content">
        <section style={{ marginTop: 12 }}>
          <span className="eyebrow">Management</span>
          <h1 className="page-title">Reports</h1>
          <p className="subtle-copy">
            Browse, filter, and manage all records. Admins and directors can
            perform approvals inline.
          </p>
        </section>

        <RouteToast status={params.status} error={params.error} />

        <ReportsPageClient
          session={session}
          activeModule={activeModule}
          period={period}
          context={context}
          invoices={invoices}
          receipts={receipts}
          pettyCash={pettyCash}
          vouchers={vouchers}
          letters={letters}
          filterSearchParams={{
            date: params.date ?? "",
            month: params.month ?? "",
            week: params.week ?? "",
          }}
        />
      </div>
    </main>
  );
}