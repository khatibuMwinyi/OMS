"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecordActionButtons } from "@/components/record-action-buttons";
import {
  approvePettyCashFromReports,
  approveLetterFromReports,
  approveVoucherFromReports,
} from "@/app/actions/report-approvals";
import type { SessionUser } from "@/lib/session";
import type {
  InvoiceRecord,
  LetterRecord,
  PettyCashRecord,
  ReceiptRecord,
  VoucherRecord,
} from "@/lib/records";
import {
  formatReportPeriodLabel,
  reportPeriodOptions,
  type ReportPeriod,
  type ReportPeriodContext,
} from "@/lib/report-period";
import type { ReportModule } from "@/app/reports/page";

// ─── Config ──────────────────────────────────────────────────────────────────

const MODULE_CONFIG: {
  key: ReportModule;
  label: string;
  eyebrow: string;
  icon: React.ElementType;
}[] = [
  { key: "invoices", label: "Invoices", eyebrow: "Revenue", icon: ClipboardList },
  { key: "receipts", label: "Receipts", eyebrow: "Revenue", icon: Receipt },
  { key: "petty-cash", label: "Petty Cash", eyebrow: "Expenses", icon: Wallet },
  {
    key: "payment-vouchers",
    label: "Payment Vouchers",
    eyebrow: "Expenses",
    icon: ClipboardList,
  },
  { key: "letters", label: "Letters", eyebrow: "Documents", icon: FileText },
];

const MODULES_NEEDING_APPROVAL: ReportModule[] = [
  "petty-cash",
  "payment-vouchers",
  "letters",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTZS(value: number) {
  return `TZS ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "approved")
    return (
      <Badge variant="success" className="px-2 py-0.5 text-[10px]">
        Approved
      </Badge>
    );
  if (s === "pending")
    return (
      <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
        Pending
      </Badge>
    );
  if (s === "rejected")
    return (
      <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
        Rejected
      </Badge>
    );
  return (
    <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
      {status}
    </Badge>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  session: SessionUser;
  activeModule: ReportModule;
  period: ReportPeriod;
  context: ReportPeriodContext;
  invoices: InvoiceRecord[];
  receipts: ReceiptRecord[];
  pettyCash: PettyCashRecord[];
  vouchers: VoucherRecord[];
  letters: LetterRecord[];
  filterSearchParams: { date: string; month: string; week: string };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsPageClient({
  session,
  activeModule,
  period: initialPeriod,
  context,
  invoices,
  receipts,
  pettyCash,
  vouchers,
  letters,
  filterSearchParams,
}: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [selectedDate, setSelectedDate] = useState(
    filterSearchParams.date || new Date().toISOString().slice(0, 10),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    filterSearchParams.month || new Date().toISOString().slice(0, 7),
  );
  const [selectedWeek, setSelectedWeek] = useState(filterSearchParams.week || "1");
  const [isDownloading, setIsDownloading] = useState(false);

  const canApprove =
    session.role === "admin" || session.role === "director";
  const showApprovalSection =
    canApprove && MODULES_NEEDING_APPROVAL.includes(activeModule);

  const currentConfig = MODULE_CONFIG.find((m) => m.key === activeModule)!;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function buildFilterParams(module = activeModule) {
    const p = new URLSearchParams();
    p.set("module", module);
    if (period !== "all") p.set("period", period);
    if (period === "daily") p.set("date", selectedDate);
    if (period === "monthly") p.set("month", selectedMonth);
    if (period === "weekly") {
      p.set("month", selectedMonth);
      p.set("week", selectedWeek);
    }
    return p;
  }

  function periodParamsString() {
    const p = new URLSearchParams();
    if (period !== "all") p.set("period", period);
    if (period === "daily") p.set("date", selectedDate);
    if (period === "monthly") p.set("month", selectedMonth);
    if (period === "weekly") {
      p.set("month", selectedMonth);
      p.set("week", selectedWeek);
    }
    return p.toString();
  }

  function navigateToModule(module: ReportModule) {
    router.push(`/reports?module=${module}`);
  }

  function applyFilter() {
    const params = buildFilterParams();
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  }

  async function handleDownload() {
    const endpoints: Record<ReportModule, string> = {
      invoices: "/api/export/report/invoices",
      receipts: "/api/export/report/receipts",
      "petty-cash": "/api/export/report/petty-cash",
      "payment-vouchers": "/api/export/report/payment-vouchers",
      letters: "/api/export/report/letters",
    };

    const filterP = buildFilterParams();
    filterP.delete("module");
    const qs = filterP.toString();
    const href = qs ? `${endpoints[activeModule]}?${qs}` : endpoints[activeModule];

    setIsDownloading(true);
    toast.loading("Preparing download...", { id: "report-dl" });

    try {
      const res = await fetch(href, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const filename =
        disposition?.match(/filename="?([^";]+)"?/)?.[1] ??
        `${activeModule}-report.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Download complete.", { id: "report-dl" });
    } catch {
      toast.error("Unable to download report.", { id: "report-dl" });
    } finally {
      setIsDownloading(false);
    }
  }

  const rangeLabel = formatReportPeriodLabel(period, {
    date: selectedDate,
    month: selectedMonth,
    week: selectedWeek,
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 mt-4">
      {/* Module Selector Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODULE_CONFIG.map(({ key, label, eyebrow, icon: Icon }) => {
          const isActive = key === activeModule;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigateToModule(key)}
              className={[
                "section-card p-4 text-left transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-lift",
                isActive
                  ? "border-accent/60 bg-accent/10 shadow-soft"
                  : "hover:border-primary/20 hover:bg-primary/5",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow !text-[0.65rem]">{eyebrow}</span>
                <Icon
                  size={14}
                  className={isActive ? "text-accent" : "text-muted-foreground"}
                />
              </div>
              <p className="section-title !text-base">{label}</p>
              {isActive && (
                <div className="mt-2 h-0.5 w-8 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Module Panel */}
      <div className="section-card overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-4 border-b border-border/85">
          <div>
            <span className="eyebrow !text-xs">{currentConfig.eyebrow}</span>
            <h2 className="section-title mt-1">{currentConfig.label}</h2>
          </div>
          <Badge variant="secondary">
            {activeModule === "invoices" && invoices.length}
            {activeModule === "receipts" && receipts.length}
            {activeModule === "petty-cash" && pettyCash.length}
            {activeModule === "payment-vouchers" && vouchers.length}
            {activeModule === "letters" && letters.length}{" "}
            records
          </Badge>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-border/85 bg-card/50">
          <label className="space-y-1.5">
            <span className="field-label text-[0.75rem]">Period</span>
            <select
              className="input h-9 text-sm"
              value={period}
              onChange={(e) => {
                const next = e.target.value as ReportPeriod;
                setPeriod(next);
              }}
            >
              {reportPeriodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {period === "daily" && (
            <label className="space-y-1.5">
              <span className="field-label text-[0.75rem]">Date</span>
              <Input
                type="date"
                className="h-9 text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
          )}

          {(period === "monthly" || period === "weekly") && (
            <label className="space-y-1.5">
              <span className="field-label text-[0.75rem]">Month</span>
              <Input
                type="month"
                className="h-9 text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </label>
          )}

          {period === "weekly" && (
            <label className="space-y-1.5">
              <span className="field-label text-[0.75rem]">Week</span>
              <select
                className="input h-9 text-sm"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              >
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
              </select>
            </label>
          )}

          {rangeLabel && (
            <p className="text-xs text-muted-foreground self-end pb-2">
              {rangeLabel}
            </p>
          )}

          <div className="flex items-end gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                "Download report"
              )}
            </Button>
            <Button type="button" size="sm" onClick={applyFilter}>
              Apply filter
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="p-5">
          {activeModule === "invoices" && (
            <InvoicesTable records={invoices} session={session} />
          )}
          {activeModule === "receipts" && (
            <ReceiptsTable records={receipts} session={session} />
          )}
          {activeModule === "petty-cash" && (
            <PettyCashTable records={pettyCash} />
          )}
          {activeModule === "payment-vouchers" && (
            <VouchersTable records={vouchers} session={session} />
          )}
          {activeModule === "letters" && (
            <LettersTable records={letters} session={session} />
          )}
        </div>

        {/* Approval Section */}
        {showApprovalSection && (
          <div className="border-t border-border/85 px-5 pb-5">
            <div className="mt-5 mb-3 flex items-center gap-3">
              <BadgeCheck size={16} className="text-accent" />
              <h3 className="section-title !text-base">Pending Approvals</h3>
              {activeModule === "petty-cash" && (
                <Badge variant="warning">
                  {pettyCash.filter((r) => r.status === "pending").length} pending
                </Badge>
              )}
              {activeModule === "payment-vouchers" && (
                <Badge variant="warning">
                  {vouchers.filter((r) => r.status === "pending").length} pending
                </Badge>
              )}
              {activeModule === "letters" && (
                <Badge variant="warning">
                  {letters.filter((r) => r.status === "pending").length} pending
                </Badge>
              )}
            </div>

            {activeModule === "petty-cash" && (
              <PettyCashApprovals
                items={pettyCash.filter((r) => r.status === "pending")}
                periodParams={periodParamsString()}
              />
            )}
            {activeModule === "payment-vouchers" && (
              <VoucherApprovals
                items={vouchers.filter((r) => r.status === "pending")}
                periodParams={periodParamsString()}
              />
            )}
            {activeModule === "letters" && (
              <LetterApprovals
                items={letters.filter((r) => r.status === "pending")}
                periodParams={periodParamsString()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invoices Table ──────────────────────────────────────────────────────────

function InvoicesTable({
  records,
  session,
}: {
  records: InvoiceRecord[];
  session: SessionUser;
}) {
  if (!records.length) {
    return <div className="empty-state">No invoice records found.</div>;
  }
  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Date</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">{item.invoiceNumber}</td>
              <td>
                <span className="block text-foreground/85">{item.customerName}</span>
                {item.sentAt && (
                  <span className="text-xs text-muted-foreground">· sent</span>
                )}
              </td>
              <td>{formatDate(item.invoiceDate)}</td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.grandTotal ?? 0))}
              </td>
              <td className="text-right">
                <RecordActionButtons
                  shareDocument={{
                    type: "invoice",
                    id: item.id,
                    title: `Invoice ${item.invoiceNumber}`,
                    summary: [
                      `Invoice ${item.invoiceNumber}`,
                      `Customer: ${item.customerName}`,
                      `Date: ${formatDate(item.invoiceDate)}`,
                      `Amount: ${formatTZS(Number(item.grandTotal ?? 0))}`,
                    ].join("\n"),
                    recipientPhone: item.phone ?? null,
                  }}
                  editHref={
                    !item.sentAt
                      ? `/invoices?edit=${item.id}`
                      : null
                  }
                  previewHref={`/api/export/invoice/${item.id}?preview=1`}
                  downloadHref={`/api/export/invoice/${item.id}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Receipts Table ───────────────────────────────────────────────────────────

function ReceiptsTable({
  records,
  session,
}: {
  records: ReceiptRecord[];
  session: SessionUser;
}) {
  if (!records.length) {
    return <div className="empty-state">No receipt records found.</div>;
  }
  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Payment</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">{item.receiptNumber}</td>
              <td>
                <span className="block">{item.customerName}</span>
                {item.sentAt && (
                  <span className="text-xs text-muted-foreground">· sent</span>
                )}
              </td>
              <td>{formatDate(item.receiptDate)}</td>
              <td>{item.paymentMethod}</td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td className="text-right">
                <RecordActionButtons
                  shareDocument={{
                    type: "receipt",
                    id: item.id,
                    title: `Receipt ${item.receiptNumber}`,
                    summary: [
                      `Receipt ${item.receiptNumber}`,
                      `Customer: ${item.customerName}`,
                      `Date: ${formatDate(item.receiptDate)}`,
                      `Amount: ${formatTZS(Number(item.amount ?? 0))}`,
                    ].join("\n"),
                    recipientPhone: item.phone ?? null,
                  }}
                  editHref={!item.sentAt ? `/receipts?edit=${item.id}` : null}
                  previewHref={`/api/export/receipt/${item.id}?preview=1`}
                  downloadHref={`/api/export/receipt/${item.id}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Petty Cash Table ─────────────────────────────────────────────────────────

function PettyCashTable({ records }: { records: PettyCashRecord[] }) {
  if (!records.length) {
    return <div className="empty-state">No petty cash records found.</div>;
  }
  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Voucher</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">
                {item.pettycashNumber || item.code || `#${item.id}`}
              </td>
              <td>{formatDate(item.date)}</td>
              <td>{item.category}</td>
              <td className="max-w-[200px] truncate">{item.description}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td className="text-right">
                <RecordActionButtons
                  downloadHref={`/api/export/petty-cash-voucher/${item.id}`}
                  previewHref={`/api/export/petty-cash-voucher/${item.id}?preview=1`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Vouchers Table ───────────────────────────────────────────────────────────

function VouchersTable({
  records,
  session,
}: {
  records: VoucherRecord[];
  session: SessionUser;
}) {
  if (!records.length) {
    return <div className="empty-state">No payment vouchers found.</div>;
  }
  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Voucher</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">{item.voucherNumber}</td>
              <td>{formatDate(item.date)}</td>
              <td>{item.category}</td>
              <td>
                <span className="block truncate max-w-[160px]">
                  {item.description}
                </span>
                {item.status === "rejected" && item.adminComment ? (
                  <span className="block text-xs text-destructive mt-0.5">
                    Reason: {item.adminComment}
                  </span>
                ) : null}
              </td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td className="text-right">
                <RecordActionButtons
                  editHref={
                    item.status !== "approved"
                      ? session.role === "admin" ||
                        item.status === "rejected"
                        ? `/payment-vouchers?edit=${item.id}`
                        : null
                      : null
                  }
                  downloadHref={`/api/export/payment-voucher/${item.id}`}
                  previewHref={`/api/export/payment-voucher/${item.id}?preview=1`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Letters Table ────────────────────────────────────────────────────────────

function LettersTable({
  records,
  session,
}: {
  records: LetterRecord[];
  session: SessionUser;
}) {
  if (!records.length) {
    return <div className="empty-state">No letter records found.</div>;
  }
  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">
                {item.referenceNumber ?? `#${item.id}`}
              </td>
              <td>{item.name}</td>
              <td className="max-w-[180px] truncate">
                {item.heading ?? item.description ?? "—"}
              </td>
              <td>{formatDate(item.letterDate ?? item.createdAt)}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className="text-right">
                <RecordActionButtons
                  shareDocument={
                    item.status === "approved"
                      ? {
                          type: "letter",
                          id: item.id,
                          title: `Letter ${item.referenceNumber ?? item.id}`,
                          summary: [
                            `Recipient: ${item.name}`,
                            `Subject: ${item.heading ?? item.description ?? "Official letter"}`,
                          ].join("\n"),
                        }
                      : null
                  }
                  editHref={
                    session.role === "admin" || item.status === "pending"
                      ? `/letters?edit=${item.id}`
                      : null
                  }
                  previewHref={`/api/export/letter/${item.id}?preview=1`}
                  downloadHref={`/api/export/letter/${item.id}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Approval: Petty Cash ─────────────────────────────────────────────────────

function PettyCashApprovals({
  items,
  periodParams,
}: {
  items: PettyCashRecord[];
  periodParams: string;
}) {
  if (!items.length) {
    return (
      <div className="empty-state">All petty cash records are up to date. Nothing pending.</div>
    );
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Voucher</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">
                {item.pettycashNumber || item.code || `#${item.id}`}
              </td>
              <td>{formatDate(item.date)}</td>
              <td>{item.category}</td>
              <td className="max-w-[180px] truncate">{item.description}</td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td className="text-right">
                <form
                  action={approvePettyCashFromReports}
                  className="flex flex-col items-end gap-2"
                >
                  <input type="hidden" name="petty_cash_id" value={item.id} />
                  <input
                    type="hidden"
                    name="_period_params"
                    value={periodParams}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      name="status"
                      value="approved"
                      variant="secondary"
                      size="sm"
                    >
                      Approve
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="rejected"
                      variant="destructive"
                      size="sm"
                    >
                      Reject
                    </Button>
                  </div>
                  <Textarea
                    name="comment"
                    placeholder="Rejection comment (required to reject)"
                    className="min-h-[56px] w-full max-w-[260px] text-xs"
                  />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Approval: Vouchers ───────────────────────────────────────────────────────

function VoucherApprovals({
  items,
  periodParams,
}: {
  items: VoucherRecord[];
  periodParams: string;
}) {
  if (!items.length) {
    return (
      <div className="empty-state">
        All payment vouchers are processed. Nothing pending.
      </div>
    );
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Voucher</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">{item.voucherNumber}</td>
              <td>{formatDate(item.date)}</td>
              <td>{item.category}</td>
              <td className="max-w-[180px] truncate">{item.description}</td>
              <td className="text-right font-semibold">
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td className="text-right">
                <form
                  action={approveVoucherFromReports}
                  className="flex flex-col items-end gap-2"
                >
                  <input type="hidden" name="voucher_id" value={item.id} />
                  <input
                    type="hidden"
                    name="_period_params"
                    value={periodParams}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      name="status"
                      value="approved"
                      variant="secondary"
                      size="sm"
                    >
                      Approve
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="rejected"
                      variant="destructive"
                      size="sm"
                    >
                      Reject
                    </Button>
                  </div>
                  <Textarea
                    name="admin_comment"
                    placeholder="Rejection comment (required to reject)"
                    className="min-h-[56px] w-full max-w-[260px] text-xs"
                  />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Approval: Letters ────────────────────────────────────────────────────────

function LetterApprovals({
  items,
  periodParams,
}: {
  items: LetterRecord[];
  periodParams: string;
}) {
  if (!items.length) {
    return (
      <div className="empty-state">All letters are approved. Nothing pending.</div>
    );
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Created</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-semibold">
                {item.referenceNumber ?? `#${item.id}`}
              </td>
              <td>{item.name}</td>
              <td className="max-w-[200px] truncate">
                {item.heading ?? item.description ?? "—"}
              </td>
              <td>{formatDate(item.createdAt)}</td>
              <td className="text-right">
                <form action={approveLetterFromReports}>
                  <input type="hidden" name="letter_id" value={item.id} />
                  <input
                    type="hidden"
                    name="_period_params"
                    value={periodParams}
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Approve
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}