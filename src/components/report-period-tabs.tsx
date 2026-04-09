"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatReportPeriodLabel,
  reportPeriodOptions,
  type ReportPeriod,
} from "@/lib/report-period";

type ReportPeriodTabsProps = {
  basePath: string;
  value: ReportPeriod;
  date?: string;
  month?: string;
  week?: string;
  queryKeyPrefix?: string;
  searchParamKey?: string;
  defaultSearchQuery?: string;
  searchPlaceholder?: string;
  className?: string;
  downloadOptions?: Array<{
    label: string;
    href: string;
  }>;
};

export function ReportPeriodTabs({
  basePath,
  value,
  date,
  month,
  week,
  queryKeyPrefix,
  searchParamKey,
  defaultSearchQuery,
  searchPlaceholder,
  className,
  downloadOptions,
}: ReportPeriodTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeDownloadHref, setActiveDownloadHref] = useState<string | null>(
    null,
  );
  const [period, setPeriod] = useState(value);
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery ?? "");
  const [selectedDate, setSelectedDate] = useState(date ?? "");
  const [selectedMonth, setSelectedMonth] = useState(month ?? "");
  const [selectedWeek, setSelectedWeek] = useState(week ?? "1");

  const periodKey = queryKeyPrefix ? `${queryKeyPrefix}_period` : "period";
  const dateKey = queryKeyPrefix ? `${queryKeyPrefix}_date` : "date";
  const monthKey = queryKeyPrefix ? `${queryKeyPrefix}_month` : "month";
  const weekKey = queryKeyPrefix ? `${queryKeyPrefix}_week` : "week";

  function resolveDownloadFilename(
    dispositionHeader: string | null,
    fallbackName: string,
  ) {
    const encodedMatch = dispositionHeader?.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1]);
    }

    const standardMatch = dispositionHeader?.match(/filename="?([^";]+)"?/i);
    if (standardMatch?.[1]) {
      return standardMatch[1];
    }

    return fallbackName;
  }

  function fallbackDownloadFilename(downloadHref: string) {
    const url = new URL(downloadHref, window.location.origin);
    const segment = url.pathname.split("/").pop() ?? "report";
    return segment.endsWith(".pdf") ? segment : `${segment}.pdf`;
  }

  useEffect(() => {
    setPeriod(value);
  }, [value]);

  useEffect(() => {
    setSelectedDate(date ?? "");
  }, [date]);

  useEffect(() => {
    setSelectedMonth(month ?? "");
  }, [month]);

  useEffect(() => {
    setSelectedWeek(week ?? "1");
  }, [week]);

  useEffect(() => {
    setSearchQuery(defaultSearchQuery ?? "");
  }, [defaultSearchQuery]);

  const resolvedBasePath = pathname || basePath;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const selectedRangeLabel = formatReportPeriodLabel(period, {
    date: selectedDate || date || null,
    month: selectedMonth || month || null,
    week: selectedWeek || week || null,
  });

  function buildFilterParams() {
    const params = queryKeyPrefix
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();
    const fallbackDate = new Date().toISOString().slice(0, 10);

    if (period === "all") {
      params.delete(periodKey);
      params.delete(dateKey);
      params.delete(monthKey);
      params.delete(weekKey);
    }

    if (period !== "all") {
      params.set(periodKey, period);
    }

    if (period === "daily") {
      params.set(dateKey, selectedDate || date || fallbackDate);
      params.delete(monthKey);
      params.delete(weekKey);
    }

    if (period === "monthly") {
      params.set(monthKey, selectedMonth || month || currentMonth);
      params.delete(dateKey);
      params.delete(weekKey);
    }

    if (period === "weekly") {
      params.set(monthKey, selectedMonth || month || currentMonth);
      params.set(weekKey, selectedWeek || week || "1");
      params.delete(dateKey);
    }

    if (searchParamKey) {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        params.set(searchParamKey, trimmedQuery);
      } else {
        params.delete(searchParamKey);
      }
    }

    if (queryKeyPrefix) {
      params.delete("status");
      params.delete("error");
    }

    return params;
  }

  function buildDownloadHref(baseHref: string) {
    const queryString = buildFilterParams().toString();
    return queryString ? `${baseHref}?${queryString}` : baseHref;
  }

  function applyFilter() {
    const params = buildFilterParams();

    const queryString = params.toString();
    router.replace(queryString ? `${resolvedBasePath}?${queryString}` : resolvedBasePath, {
      scroll: false,
    });
  }

  async function handleDownload(optionHref: string, optionLabel: string) {
    if (activeDownloadHref) {
      return;
    }

    const downloadHref = buildDownloadHref(optionHref);
    const toastId = `download-${optionHref}`;

    setActiveDownloadHref(optionHref);
    toast.loading(`Preparing ${optionLabel.toLowerCase()}...`, { id: toastId });

    try {
      const response = await fetch(downloadHref, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Report download failed.");
      }

      const blob = await response.blob();
      const filename = resolveDownloadFilename(
        response.headers.get("content-disposition"),
        fallbackDownloadFilename(downloadHref),
      );

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success("Download complete.", { id: toastId });
    } catch {
      toast.error("Unable to download report.", { id: toastId });
    } finally {
      setActiveDownloadHref(null);
    }
  }

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
      }
    >
      <label className="space-y-2">
        <span className="field-label">Period</span>
        <select
          name="period"
          className="input"
          value={period}
          onChange={(event) => {
            const nextPeriod = event.target.value as ReportPeriod;
            setPeriod(nextPeriod);

            if (nextPeriod === "monthly" && !selectedMonth) {
              setSelectedMonth(currentMonth);
            }

            if (nextPeriod === "weekly") {
              setSelectedMonth((current) => current || currentMonth);
              setSelectedWeek((current) => current || "1");
            }
          }}
        >
          {reportPeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {period === "daily" ? (
        <label className="space-y-2">
          <span className="field-label">Date</span>
          <Input
            name="date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      ) : null}

      {period === "monthly" ? (
        <label className="space-y-2">
          <span className="field-label">Month</span>
          <Input
            name="month"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      ) : null}

      {period === "weekly" ? (
        <>
          <label className="space-y-2">
            <span className="field-label">Month</span>
            <Input
              name="month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="field-label">Week</span>
            <select
              name="week"
              className="input"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
            >
              <option value="1">Week 1</option>
              <option value="2">Week 2</option>
              <option value="3">Week 3</option>
              <option value="4">Week 4</option>
            </select>
          </label>

          {selectedRangeLabel ? (
            <p className="min-w-full text-xs text-muted-foreground">
              {selectedRangeLabel}
            </p>
          ) : null}
        </>
      ) : null}

      {searchParamKey ? (
        <label className="space-y-2">
          <span className="field-label">Search</span>
          <Input
            type="search"
            value={searchQuery}
            placeholder={searchPlaceholder ?? "Search records..."}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      ) : null}

      {downloadOptions?.map((option) => (
        <Button
          key={option.href}
          type="button"
          variant="outline"
          disabled={activeDownloadHref !== null}
          onClick={() => {
            void handleDownload(option.href, option.label);
          }}
        >
          {activeDownloadHref === option.href ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Downloading...
            </>
          ) : (
            option.label
          )}
        </Button>
      ))}

      <Button type="button" onClick={applyFilter}>
        Apply filter
      </Button>
    </div>
  );
}
