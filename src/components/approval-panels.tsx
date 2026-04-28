"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  updatePettyCashStatusAction,
  updateVoucherStatusAction,
  approveLetterAction,
} from "@/app/actions/records";

type TabKey = "petty-cash" | "payment-vouchers" | "letters";

const tabs: { key: TabKey; label: string }[] = [
  { key: "petty-cash", label: "Petty Cash Vouchers" },
  { key: "payment-vouchers", label: "Payment Vouchers" },
  { key: "letters", label: "Letters" },
];

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

type ApprovalPanelsProps = {
  pendingPettyCash: Array<{
    id: number;
    date: string;
    pettycashNumber: string | null;
    description: string;
    category: string;
    amount: number;
    status: string;
  }>;
  pendingVouchers: Array<{
    id: number;
    voucherNumber: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    status: string;
  }>;
  pendingLetters: Array<{
    id: number;
    name: string;
    description: string | null;
    referenceNumber: string | null;
    createdAt: string;
    status: string;
  }>;
};

export function ApprovalPanels({
  pendingPettyCash,
  pendingVouchers,
  pendingLetters,
}: ApprovalPanelsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("petty-cash");

  const availableTabs = tabs.filter(({ key }) => {
    if (key === "petty-cash") return pendingPettyCash.length > 0;
    if (key === "payment-vouchers") return pendingVouchers.length > 0;
    if (key === "letters") return pendingLetters.length > 0;
    return false;
  });

  const activeTabIsAvailable = availableTabs.some((t) => t.key === activeTab);
  const initialTab = activeTabIsAvailable
    ? activeTab
    : (availableTabs[0]?.key ?? "petty-cash");

  const effectiveTab = activeTabIsAvailable ? activeTab : initialTab;

  return (
    <div>
      <div className="module-tab-nav mb-4" role="tablist">
        {availableTabs.map(({ key, label }) => {
          const isActive = effectiveTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`tab-${key}`}
              className={`module-tab${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {effectiveTab === "petty-cash" && pendingPettyCash.length > 0 && (
        <div role="tabpanel" id="panel-petty-cash">
          <PettyCashPanel items={pendingPettyCash} />
        </div>
      )}

      {effectiveTab === "payment-vouchers" && pendingVouchers.length > 0 && (
        <div role="tabpanel" id="panel-payment-vouchers">
          <VouchersPanel items={pendingVouchers} />
        </div>
      )}

      {effectiveTab === "letters" && pendingLetters.length > 0 && (
        <div role="tabpanel" id="panel-letters">
          <LettersPanel items={pendingLetters} />
        </div>
      )}
    </div>
  );
}

function PettyCashPanel({
  items,
}: {
  items: ApprovalPanelsProps["pendingPettyCash"];
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">No petty cash vouchers pending approval.</div>
    );
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr className="border-b border-border/85">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Voucher
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Description
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Category
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/75 last:border-b-0 hover:bg-white/10"
            >
              <td
                data-label="Voucher"
                className="px-4 py-4 align-top text-sm font-semibold text-foreground"
              >
                {item.pettycashNumber || "—"}
              </td>
              <td
                data-label="Description"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.description}
              </td>
              <td
                data-label="Category"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.category}
              </td>
              <td
                data-label="Amount"
                className="px-4 py-4 align-top text-right text-sm font-semibold text-foreground"
              >
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td
                data-label="Action"
                className="px-4 py-4 align-top text-right"
              >
                <form action={updatePettyCashStatusAction} className="flex flex-col items-end gap-2">
                  <input type="hidden" name="petty_cash_id" value={item.id} />
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
                    placeholder="Comment (required for rejection)"
                    className="min-h-[60px] w-full max-w-[280px] text-xs"
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

function VouchersPanel({
  items,
}: {
  items: ApprovalPanelsProps["pendingVouchers"];
}) {
  if (items.length === 0) {
    return <div className="empty-state">No payment vouchers pending approval.</div>;
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr className="border-b border-border/85">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Voucher
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Category
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/75 last:border-b-0 hover:bg-white/10"
            >
              <td
                data-label="Voucher"
                className="px-4 py-4 align-top text-sm font-semibold text-foreground"
              >
                {item.voucherNumber}
              </td>
              <td
                data-label="Category"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.category}
              </td>
              <td
                data-label="Description"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.description}
              </td>
              <td
                data-label="Amount"
                className="px-4 py-4 align-top text-right text-sm font-semibold text-foreground"
              >
                {formatTZS(Number(item.amount ?? 0))}
              </td>
              <td
                data-label="Action"
                className="px-4 py-4 align-top text-right"
              >
                <form action={updateVoucherStatusAction} className="flex flex-col items-end gap-2">
                  <input type="hidden" name="voucher_id" value={item.id} />
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
                    placeholder="Comment (required for rejection)"
                    className="min-h-[60px] w-full max-w-[280px] text-xs"
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

function LettersPanel({
  items,
}: {
  items: ApprovalPanelsProps["pendingLetters"];
}) {
  if (items.length === 0) {
    return <div className="empty-state">No letters pending approval.</div>;
  }

  return (
    <div className="record-table-wrapper">
      <table className="record-table">
        <thead>
          <tr className="border-b border-border/85">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Recipient
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Subject
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Reference
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/75 last:border-b-0 hover:bg-white/10"
            >
              <td
                data-label="Recipient"
                className="px-4 py-4 align-top text-sm font-semibold text-foreground"
              >
                {item.name}
              </td>
              <td
                data-label="Subject"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.description || "—"}
              </td>
              <td
                data-label="Reference"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {item.referenceNumber || "—"}
              </td>
              <td
                data-label="Date"
                className="px-4 py-4 align-top text-sm text-foreground/75"
              >
                {formatDate(item.createdAt)}
              </td>
              <td
                data-label="Action"
                className="px-4 py-4 align-top text-right"
              >
                <form action={approveLetterAction}>
                  <input type="hidden" name="letter_id" value={item.id} />
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