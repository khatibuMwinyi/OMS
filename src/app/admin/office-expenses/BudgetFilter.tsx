"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type BudgetFilterProps = {
  year: number;
  monthFilter: number;
  yearOptions: number[];
  monthNames: string[];
};

export function BudgetFilter({ year, monthFilter, yearOptions, monthNames }: BudgetFilterProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonth, setSelectedMonth] = useState(monthFilter);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <select
        className="input"
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
      >
        {monthNames.map((n, i) => (
          <option key={n} value={i + 1}>
            {n}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          router.push(`/admin/office-expenses?year=${selectedYear}&month=${selectedMonth}`, { scroll: false });
        }}
      >
        Apply
      </Button>
    </div>
  );
}