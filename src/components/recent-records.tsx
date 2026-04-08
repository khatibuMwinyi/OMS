import { headers } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordActionButtons } from "@/components/record-action-buttons";

type RecordItem = {
  id: number;
  title: string;
  subtitle: string;
  value: string;
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
        type: "invoice" | "receipt";
        title?: string;
        summary?: string;
      }
    | null;
  getEditHref?: (item: RecordItem) => string;
  getPreviewHref?: (item: RecordItem) => string | null | undefined;
  getDownloadHref?: (item: RecordItem) => string | null | undefined;
};

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto");

  if (!host) {
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
                <tr className="border-b border-border/70">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {columns.record}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {columns.details}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {columns.value}
                  </th>
                  {hasActions ? (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                      className="border-b border-border/60 last:border-b-0 hover:bg-slate-50/80"
                      key={`${title}-${item.id}`}
                    >
                      <td
                        data-label={columns.record}
                        className="px-4 py-4 align-top text-sm font-semibold text-slate-950"
                      >
                        {item.title}
                      </td>
                      <td
                        data-label={columns.details}
                        className="px-4 py-4 align-top text-sm text-slate-600"
                      >
                        {item.subtitle}
                      </td>
                      <td
                        data-label={columns.value}
                        className="px-4 py-4 align-top text-right text-sm font-semibold text-slate-900"
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
                                    summary: shareDocument.summary ?? item.subtitle,
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
