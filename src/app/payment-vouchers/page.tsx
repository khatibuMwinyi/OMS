import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoucherFormFields } from "@/components/voucher-form-fields";
import {
  getNextVoucherNumber,
  getVoucherDocument,
  listVouchers,
} from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCategoriesWithFallback } from "@/lib/categories";
import { getCurrentSession } from "@/lib/session-server";

import {
  createVoucherAction,
  updateVoucherAction,
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

function renderVoucherStatus(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "approved") {
    return (
      <Badge variant="success" className="px-2 py-0.5 text-[10px]">
        Approved
      </Badge>
    );
  }

  if (normalizedStatus === "pending") {
    return (
      <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
        Pending
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
    edit?: string;
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
  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;

  const editDocument = isEditing
    ? await getVoucherDocument(session, editId)
    : null;

  if (isEditing && !editDocument) {
    redirect("/payment-vouchers?error=Payment%20voucher%20not%20found.");
  }

  if (isEditing && editDocument?.status === "approved") {
    redirect("/payment-vouchers?error=Approved%20vouchers%20cannot%20be%20edited.");
  }

  if (isEditing && session.role === "secretary" && editDocument?.status !== "rejected") {
    redirect(
      "/payment-vouchers?error=Only%20rejected%20vouchers%20can%20be%20edited%20by%20secretary.",
    );
  }

  const voucherHistory = await listVouchers(
    session,
    1000,
    reportPeriod,
    reportContext,
  );
  const vouchers = voucherHistory.slice(0, 20);
  const pendingVouchers = vouchers.filter((item) => item.status === "pending");
  const nextVoucherNumber = await getNextVoucherNumber();
  const categories = await getCategoriesWithFallback("voucher");
  const selectedVoucherId = pendingVouchers[0]?.id ?? "";

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
                <span className="eyebrow">
                  {isEditing ? "Edit payment voucher" : "Create payment voucher"}
                </span>
                <h2 className="section-title">
                  {isEditing ? "Edit payment voucher" : "Create payment voucher"}
                </h2>
              </div>
            </div>

            <form
              action={isEditing ? updateVoucherAction : createVoucherAction}
              className="form-grid form-grid--wide"
            >
              {isEditing && editDocument ? (
                <input
                  name="voucher_id"
                  type="hidden"
                  value={editDocument.id}
                  readOnly
                />
              ) : null}

              <VoucherFormFields
                categories={categories}
                voucherNumber={
                  isEditing
                    ? (editDocument?.voucherNumber ?? "")
                    : nextVoucherNumber
                }
                defaultDate={editDocument?.date ?? ""}
                defaultCustomerName={editDocument?.customerName ?? ""}
                defaultPaymentMethod={editDocument?.paymentMethod ?? "Cash"}
                defaultBankName={editDocument?.bankName ?? ""}
                defaultAccountNumber={editDocument?.accountNumber ?? ""}
                defaultAccountName={editDocument?.accountName ?? ""}
                defaultBankReference={editDocument?.bankReference ?? ""}
                defaultMobileNumber={editDocument?.mobileNumber ?? ""}
                defaultPayerName={editDocument?.payerName ?? ""}
                defaultMobileReference={editDocument?.mobileReference ?? ""}
                defaultType={editDocument?.type ?? undefined}
                defaultCategory={editDocument?.category ?? undefined}
                defaultCode={editDocument?.code ?? undefined}
                defaultDescription={editDocument?.description ?? undefined}
                defaultAmount={editDocument?.amount ?? null}
              />

              {isEditing && editDocument?.status === "rejected" && editDocument.adminComment ? (
                <div className="banner banner--error lg:col-span-2">
                  Rejection reason: {editDocument.adminComment}
                </div>
              ) : null}

              <div className="button-row lg:col-span-2">
                <Button type="submit">
                  {isEditing ? "Update payment voucher" : "Create payment voucher"}
                </Button>
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
              downloadOptions={[
                {
                  label: "Download payment vouchers report",
                  href: "/api/export/report/payment-vouchers",
                },
              ]}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
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
              getEditHref={(item) => {
                const source = vouchers.find((record) => record.id === item.id);
                if (!source || source.status === "approved") {
                  return null;
                }

                if (session.role === "admin") {
                  return `/payment-vouchers?edit=${item.id}`;
                }

                return source.status === "rejected"
                  ? `/payment-vouchers?edit=${item.id}`
                  : null;
              }}
              items={vouchers.map((item) => ({
                id: item.id,
                title: item.voucherNumber,
                subtitle: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{item.category}</span>
                    <span aria-hidden="true">&middot;</span>
                    {renderVoucherStatus(item.status)}
                    {item.status === "rejected" && item.adminComment ? (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>Reason: {item.adminComment}</span>
                      </>
                    ) : null}
                    <span aria-hidden="true">&middot;</span>
                    <span>{formatDate(item.date)}</span>
                  </span>
                ),
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
                    {pendingVouchers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.voucherNumber} - {item.status} -{" "}
                        {formatDate(item.date)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">Rejection comment</span>
                  <Textarea
                    name="admin_comment"
                    placeholder="Explain what needs to be corrected before approval"
                  />
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
