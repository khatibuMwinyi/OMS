"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  className?: string;
};

export function ReportPeriodTabs({
  basePath,
  value,
  date,
  month,
  week,
  className,
}: ReportPeriodTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState(value);
  const [selectedDate, setSelectedDate] = useState(date ?? "");
  const [selectedMonth, setSelectedMonth] = useState(month ?? "");
  const [selectedWeek, setSelectedWeek] = useState(week ?? "1");

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

  const resolvedBasePath = pathname || basePath;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const selectedRangeLabel = formatReportPeriodLabel(period, {
    date: selectedDate || date || null,
    month: selectedMonth || month || null,
    week: selectedWeek || week || null,
  });

  function applyFilter() {
    const params = new URLSearchParams();

    if (period !== "all") {
      params.set("period", period);
    }

    if (period === "daily" && selectedDate) {
      params.set("date", selectedDate);
    }

    if (period === "monthly") {
      params.set("month", selectedMonth || currentMonth);
    }

    if (period === "weekly") {
      params.set("month", selectedMonth || currentMonth);
      params.set("week", selectedWeek || "1");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${resolvedBasePath}?${queryString}` : resolvedBasePath, {
      scroll: false,
    });
  }

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
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
            <p className="min-w-full text-xs text-slate-500">
              {selectedRangeLabel}
            </p>
          ) : null}
        </>
      ) : null}

      <Button type="button" onClick={applyFilter}>
        Apply filter
      </Button>
    </div>
  );
}
