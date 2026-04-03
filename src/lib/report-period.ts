export type ReportPeriod = "all" | "daily" | "weekly" | "monthly";

export type ReportPeriodContext = {
  date?: string | null;
  month?: string | null;
  week?: string | number | null;
};

export type ReportDateRange = {
  startDate: Date;
  endDate: Date;
};

export const reportPeriodOptions: Array<{
  value: ReportPeriod;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
];

export function normalizeReportPeriod(
  value: string | null | undefined,
): ReportPeriod {
  if (value === "daily" || value === "day") {
    return "daily";
  }

  if (value === "weekly" || value === "week") {
    return "weekly";
  }

  if (value === "monthly" || value === "month") {
    return "monthly";
  }

  return "all";
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReferenceDate(value: string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseReferenceMonth(
  value: string | null | undefined,
  fallback: Date,
) {
  if (!value) {
    return startOfMonth(fallback);
  }

  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfMonth(fallback) : startOfMonth(parsed);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(value: Date) {
  const date = startOfDay(value);
  date.setDate(1);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(value: Date, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
}

function getWeeklyReportDateRange(context?: ReportPeriodContext) {
  const reference = parseReferenceDate(context?.date);
  const referenceMonth = parseReferenceMonth(context?.month, reference);
  const weekNumber = Math.min(
    Math.max(Number.parseInt(String(context?.week ?? 1), 10) || 1, 1),
    4,
  );

  const startDate = addDays(referenceMonth, (weekNumber - 1) * 7);
  const endDate = weekNumber === 4 ? addMonths(referenceMonth, 1) : addDays(startDate, 7);

  return {
    startDate,
    endDate,
  };
}

export function getReportPeriodDateRange(
  period: ReportPeriod,
  context?: ReportPeriodContext,
): ReportDateRange | null {
  if (period === "all") {
    return null;
  }

  const reference = parseReferenceDate(context?.date);

  if (period === "weekly") {
    return getWeeklyReportDateRange(context);
  }

  if (period === "monthly") {
    const startDate = parseReferenceMonth(context?.month, reference);
    return {
      startDate,
      endDate: addMonths(startDate, 1),
    };
  }

  return {
    startDate: startOfDay(reference),
    endDate: addDays(startOfDay(reference), 1),
  };
}

export function formatReportPeriodLabel(
  period: ReportPeriod,
  context?: ReportPeriodContext,
) {
  const range = getReportPeriodDateRange(period, context);

  if (!range) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (period === "weekly") {
    const weekNumber = Math.min(
      Math.max(Number.parseInt(String(context?.week ?? 1), 10) || 1, 1),
      4,
    );

    return `Week ${weekNumber}: ${formatter.format(range.startDate)} - ${formatter.format(addDays(range.endDate, -1))}`;
  }

  if (period === "monthly") {
    return `Month: ${formatter.format(range.startDate)} - ${formatter.format(addDays(range.endDate, -1))}`;
  }

  return `Day: ${formatter.format(range.startDate)}`;
}

export function buildReportPeriodScope(
  column: string,
  period: ReportPeriod,
  context?: ReportPeriodContext,
) {
  const range = getReportPeriodDateRange(period, context);

  if (!range) {
    return { clause: "", params: [] as Array<string | number> };
  }

  return {
    clause: ` AND ${column} >= ? AND ${column} < ?`,
    params: [toDateOnly(range.startDate), toDateOnly(range.endDate)],
  };
}
