import { headers } from "next/headers";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordActionButtons } from "@/components/record-action-buttons";

type RecordItem = {
  id: number;
  title: string;
  subtitle: ReactNode;
  value: ReactNode;
};

type RecentRecordsProps = {
  title: string;
  items: RecordItem[];
  emptyText: string;
  columns?: {
    record: string;
    details: string;
    value: string;
  };
  getShareDocument?: (item: RecordItem) =>
    | {
        type: "invoice" | "receipt" | "letter";
        title?: string;
        summary?: string;
        recipientPhone?: string | null;
      }
    | null;
  getEditHref?: (item: RecordItem) => string | null | undefined;
  getPreviewHref?: (item: RecordItem) => string | null | undefined;
  getDownloadHref?: (item: RecordItem) => string | null | undefined;
};

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto");
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim();

  if (!host) {
    if (configuredUrl) {
      try {
        return new URL(configuredUrl).origin;
      } catch {
        // Ignore malformed PUBLIC_APP_URL and fall back to localhost in dev-only scenarios.
      }
    }

    return "http://localhost:3000";
  }

  if (proto) {
    return `${proto}://${host}`;
  }

  return host.includes("localhost") || host.includes("127.0.0.1")
    ? `http://${host}`
    : `https://${host}`;
}

export async function RecentRecords({
  title,
  items,
  emptyText,
  columns = {
    record: "Record",
    details: "Details",
    value: "Value",
  },
  getShareDocument,
  getEditHref,
  getPreviewHref,
  getDownloadHref,
}: RecentRecordsProps) {
  const hasActions =
    typeof getShareDocument === "function" ||
    typeof getEditHref === "function" ||
    typeof getDownloadHref === "function";
  const origin = await getRequestOrigin();

  function appendPreviewParam(href: string) {
    const url = new URL(href, origin);
    url.searchParams.set("preview", "1");
    return url.toString();
  }

  return (
    <Card className="recent-card">
      <CardHeader className="flex-row items-center justify-between gap-3 px-5 py-5">
        <CardTitle className="section-title text-lg">{title}</CardTitle>
        <Badge variant="secondary">Latest 5</Badge>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        {items.length > 0 ? (
          <div className="record-table-wrapper">
            <table
              className={`record-table ${hasActions ? "record-table--with-action" : ""}`}
            >
              <thead>
                <tr className="border-b border-border/85">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {columns.record}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {columns.details}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {columns.value}
                  </th>
                  {hasActions ? (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const downloadHref = getDownloadHref
                    ? getDownloadHref(item) ?? null
                    : null;
                  const previewHref = getPreviewHref
                    ? getPreviewHref(item) ?? null
                    : downloadHref
                      ? appendPreviewParam(downloadHref)
                      : null;
                  const shareDocument = getShareDocument
                    ? getShareDocument(item)
                    : null;

                  return (
                    <tr
                      className="border-b border-border/75 last:border-b-0 hover:bg-white/10"
                      key={`${title}-${item.id}`}
                    >
                      <td
                        data-label={columns.record}
                        className="px-4 py-4 align-top text-sm font-semibold text-foreground"
                      >
                        {item.title}
                      </td>
                      <td
                        data-label={columns.details}
                        className="px-4 py-4 align-top text-sm text-foreground/75"
                      >
                        {item.subtitle}
                      </td>
                      <td
                        data-label={columns.value}
                        className="px-4 py-4 align-top text-right text-sm font-semibold text-foreground"
                      >
                        {item.value}
                      </td>
                      {hasActions ? (
                        <td
                          data-label="Action"
                          className="px-4 py-4 align-top text-right"
                        >
                          <RecordActionButtons
                            shareDocument={
                              shareDocument
                                ? {
                                    type: shareDocument.type,
                                    id: item.id,
                                    title: shareDocument.title ?? item.title,
                                    summary:
                                      shareDocument.summary ??
                                      (typeof item.subtitle === "string"
                                        ? item.subtitle
                                        : item.title),
                                    recipientPhone:
                                      shareDocument.recipientPhone ?? null,
                                  }
                                : null
                            }
                            editHref={getEditHref ? getEditHref(item) : null}
                            previewHref={previewHref}
                            downloadHref={downloadHref}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">{emptyText}</div>
        )}
      </CardContent>
    </Card>
  );
}
