import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { VoucherFormFields } from "@/components/voucher-form-fields";
import { getNextVoucherNumber, listVouchers } from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCurrentSession } from "@/lib/session-server";

import {
  createVoucherAction,
  updateVoucherStatusAction,
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

export default async function PaymentVouchersPage({ searchParams }: PageProps) {
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

  const voucherHistory = await listVouchers(
    session,
    1000,
    reportPeriod,
    reportContext,
  );
  const vouchers = voucherHistory.slice(0, 20);
  const nextVoucherNumber = await getNextVoucherNumber();
  const selectedVoucherId =
    vouchers.find((item) => item.status === "pending")?.id ??
    vouchers[0]?.id ??
    "";

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/payment-vouchers" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Expenses</span>
            <h1 className="page-title">Payment vouchers</h1>
            <p className="subtle-copy">
              Create payment vouchers and, for admins, approve or reject pending
              records.
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
                <span className="eyebrow">Create payment voucher</span>
                <h2 className="section-title">Save payment voucher</h2>
              </div>
            </div>

            <form
              action={createVoucherAction}
              className="form-grid form-grid--wide"
            >
              <VoucherFormFields voucherNumber={nextVoucherNumber} />

              <div className="button-row md:col-span-2">
                <Button type="submit">Save payment voucher</Button>
              </div>
            </form>
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent payment vouchers</span>
                <h2 className="section-title">Latest payment records</h2>
              </div>
            </div>

            <ReportPeriodTabs
              basePath="/payment-vouchers"
              value={reportPeriod}
              date={resolvedSearchParams.date ?? ""}
              month={resolvedSearchParams.month ?? ""}
              week={resolvedSearchParams.week ?? ""}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
            />

            <RecentRecords
              title="Payment vouchers"
              emptyText="No payment voucher records found yet."
              columns={{
                record: "Payment voucher",
                details: "Category / Status",
                value: "Amount",
              }}
              getDownloadHref={(item) =>
                `/api/export/payment-voucher/${item.id}`
              }
              items={vouchers.map((item) => ({
                id: item.id,
                title: item.voucherNumber,
                subtitle: `${item.category} · ${item.status} · ${formatDate(item.date)}`,
                value: formatTZS(Number(item.amount ?? 0)),
              }))}
            />

            {session.role === "admin" ? (
              <form action={updateVoucherStatusAction} className="approval-row">
                <label>
                  <span className="field-label">Payment voucher</span>
                  <select
                    className="input"
                    name="voucher_id"
                    defaultValue={String(selectedVoucherId)}
                    required
                  >
                    <option value="" disabled>
                      Select a payment voucher
                    </option>
                    {vouchers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.voucherNumber} - {item.status} -{" "}
                        {formatDate(item.date)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="button-row">
                  <Button
                    variant="secondary"
                    type="submit"
                    name="status"
                    value="approved"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    type="submit"
                    name="status"
                    value="rejected"
                  >
                    Reject
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
