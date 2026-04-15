import { redirect } from "next/navigation";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Receipt,
  UsersRound,
  Wallet,
} from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { DashboardModuleToggle } from "@/components/dashboard-module-toggle";
import { RecentRecords } from "@/components/recent-records";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { getDashboardOverview } from "@/lib/dashboard";
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

function renderLetterStatus(status: "pending" | "approved") {
  if (status === "approved") {
    return (
      <Badge variant="success" className="px-2 py-0.5 text-[10px]">
        Approved
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
      Pending Approval
    </Badge>
  );
}

const summaryIcons = {
  Invoices: ClipboardList,
  Receipts: Receipt,
  "Petty Cash Voucher": Wallet,
  "Approved Payment Vouchers": BadgeCheck,
  "Printed Letters": FileText,
  Users: UsersRound,
} as const;

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const overview = await getDashboardOverview(session);
  const invoiceSummaries = new Map(
    overview.recentInvoices.map((item) => [
      item.id,
      [
        `Invoice ${item.invoiceNumber}`,
        `Customer: ${item.customerName}`,
        `Date: ${formatDate(item.invoiceDate)}`,
        `Amount: ${formatTZS(Number(item.grandTotal ?? 0))}`,
      ].join("\n"),
    ]),
  );
  const receiptSummaries = new Map(
    overview.recentReceipts.map((item) => [
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
      <AppHeader session={session} activeHref="/dashboard" />

      <div className="dashboard-content">
        <section style={{ marginTop: 12 }}>
          <span className="eyebrow">System overview</span>
          <h1 className="page-title">Dashboard</h1>
          <p className="subtle-copy">
            {overview.scopeLabel} are shown below. View all system records and activities.
          </p>
        </section>

        {/* Responsive summary grid */}
        <section className="summary-grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
          {overview.summary.map((item) => (
            <StatCard
              key={item.label}
              label={item.label}
              value={String(item.value)}
              detail={item.detail}
              icon={summaryIcons[item.label as keyof typeof summaryIcons]}
            />
          ))}
        </section>

        {/* Responsive section grid for modules */}
        <section className="section-grid">
          <div className="col-span-full w-full min-w-0">
            <div className="section-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="eyebrow">Recent records</span>
                <h2 className="section-title">Latest database entries</h2>
              </div>
              <span className="pill">
                <LayoutDashboard size={15} />
                Live data
              </span>
            </div>

            <div className="recent-records-stack flex flex-col gap-3 sm:gap-4">
              <DashboardModuleToggle
                modules={[
                  { key: "invoices", label: "Invoices" },
                  { key: "receipts", label: "Receipts" },
                  { key: "petty-cash", label: "Petty Cash" },
                  { key: "payment-vouchers", label: "Payment Vouchers" },
                  { key: "letters", label: "Letters" },
                ]}
                defaultModule="invoices"
              />

              <div className="space-y-4">
                <div
                  data-dashboard-module="invoices"
                  className="dashboard-module-panel"
                >
                  <RecentRecords
                    title="Invoices"
                    variant="table"
                    emptyText="No invoices found yet."
                    columns={{
                      record: "Invoice",
                      details: "Customer",
                      value: "Amount",
                    }}
                    getShareDocument={(item) => {
                      const source = overview.recentInvoices.find(
                        (record) => record.id === item.id,
                      );
                      const summary =
                        invoiceSummaries.get(item.id) ?? `Invoice ${item.title}`;

                      return {
                        type: "invoice",
                        title: `Invoice ${item.title}`,
                        summary,
                        recipientPhone: source?.phone ?? null,
                      };
                    }}
                    getEditHref={(item) => {
                      const source = overview.recentInvoices.find(
                        (record) => record.id === item.id,
                      );
                      if (!source || source.sentAt) {
                        return null;
                      }

                      return `/invoices?edit=${item.id}`;
                    }}
                    getDownloadHref={(item) => `/api/export/invoice/${item.id}`}
                    items={overview.recentInvoices.map((item) => ({
                      id: item.id,
                      title: item.invoiceNumber,
                      subtitle: `${item.customerName} · ${formatDate(item.invoiceDate)}${item.sentAt ? " · sent" : ""}`,
                      value: formatTZS(Number(item.grandTotal ?? 0)),
                    }))}
                  />
                </div>

                <div
                  data-dashboard-module="receipts"
                  className="dashboard-module-panel hidden"
                >
                  <RecentRecords
                    title="Receipts"
                    variant="table"
                    emptyText="No receipts found yet."
                    columns={{
                      record: "Receipt",
                      details: "Customer",
                      value: "Amount",
                    }}
                    getShareDocument={(item) => {
                      const source = overview.recentReceipts.find(
                        (record) => record.id === item.id,
                      );
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
                      const source = overview.recentReceipts.find(
                        (record) => record.id === item.id,
                      );
                      if (!source || source.sentAt) {
                        return null;
                      }

                      return `/receipts?edit=${item.id}`;
                    }}
                    getDownloadHref={(item) => `/api/export/receipt/${item.id}`}
                    items={overview.recentReceipts.map((item) => ({
                      id: item.id,
                      title: item.receiptNumber,
                      subtitle: `${item.customerName} · ${formatDate(item.receiptDate)} · ${item.paymentMethod}${item.sentAt ? " · sent" : ""}`,
                      value: formatTZS(Number(item.amount ?? 0)),
                    }))}
                  />
                </div>

                <div
                  data-dashboard-module="petty-cash"
                  className="dashboard-module-panel hidden"
                >
                  <RecentRecords
                    title="Petty cash vouchers"
                    variant="table"
                    emptyText="No petty cash voucher records found yet."
                    columns={{
                      record: "Entry",
                      details: "Description",
                      value: "Amount",
                    }}
                    getDownloadHref={(item) => `/api/export/petty-cash-voucher/${item.id}`}
                    items={overview.recentPettyCash.map((item) => ({
                      id: item.id,
                      title:
                        item.pettycashNumber ||
                        item.code ||
                        item.referenceNumber ||
                        item.description,
                      subtitle: `${item.description} · ${item.category} · ${formatDate(item.date)}`,
                      value: formatTZS(Number(item.amount ?? 0)),
                    }))}
                  />
                </div>

                <div
                  data-dashboard-module="payment-vouchers"
                  className="dashboard-module-panel hidden"
                >
                  <RecentRecords
                    title="Payment vouchers"
                    variant="table"
                    emptyText="No payment vouchers found yet."
                    columns={{
                      record: "Payment voucher",
                      details: "Status",
                      value: "Amount",
                    }}
                    getEditHref={(item) => {
                      const source = overview.recentVouchers.find(
                        (record) => record.id === item.id,
                      );
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
                    getDownloadHref={(item) => `/api/export/payment-voucher/${item.id}`}
                    items={overview.recentVouchers.map((item) => ({
                      id: item.id,
                      title: item.voucherNumber,
                      subtitle: (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span>{item.category}</span>
                          <span aria-hidden="true">&middot;</span>
                          {renderVoucherStatus(item.status)}
                          <span aria-hidden="true">&middot;</span>
                          <span>{formatDate(item.voucherDate)}</span>
                        </span>
                      ),
                      value: formatTZS(Number(item.amount ?? 0)),
                    }))}
                  />
                </div>

                <div
                  data-dashboard-module="letters"
                  className="dashboard-module-panel hidden"
                >
                  <RecentRecords
                    title="Printed letters"
                    variant="table"
                    emptyText="No letters found yet."
                    columns={{
                      record: "Recipient",
                      details: "Subject / Created",
                      value: "Status",
                    }}
                    getShareDocument={(item) => {
                      const source = overview.recentLetters.find(
                        (record) => record.id === item.id,
                      );
                      if (!source || source.status !== "approved") {
                        return null;
                      }

                      return {
                        type: "letter",
                        title: `Letter ${source.name}`,
                        summary: `Subject: ${source.description || "Official letter"}\nStatus: ${source.status}`,
                      };
                    }}
                    getEditHref={(item) => {
                      const source = overview.recentLetters.find(
                        (record) => record.id === item.id,
                      );
                      if (!source) {
                        return null;
                      }

                      if (session.role === "admin") {
                        return `/letters?edit=${item.id}`;
                      }

                      return source.status === "pending"
                        ? `/letters?edit=${item.id}`
                        : null;
                    }}
                    getDownloadHref={(item) => `/api/export/letter/${item.id}`}
                    items={overview.recentLetters.map((item) => ({
                      id: item.id,
                      title: item.name,
                      subtitle: item.description
                        ? `${item.description.slice(0, 90)} · ${formatDate(item.createdAt)}`
                        : `No subject stored · ${formatDate(item.createdAt)}`,
                      value: renderLetterStatus(item.status),
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
