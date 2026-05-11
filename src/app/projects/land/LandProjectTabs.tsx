"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TabKey =
  | "overview"
  | "flow"
  | "report"
  | "entries"
  | "office-items"
  | "add-project";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "flow", label: "Financial Flow" },
  { key: "report", label: "Full Report" },
  { key: "entries", label: "Add Entry" },
  { key: "office-items", label: "Office Items" },
  { key: "add-project", label: "+ Next Project" },
];

type Props = {
  activeSeqId: number;
  selectedProjectId: number | null;
  initialTab: string;
};

export function LandProjectTabs({ activeSeqId, selectedProjectId, initialTab }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>((initialTab as TabKey) ?? "overview");

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set("seq", String(activeSeqId));
    if (selectedProjectId) {
      params.set("project", String(selectedProjectId));
    }
    params.set("tab", tab);
    router.push(`/projects/land?${params.toString()}`, { scroll: false });
  }

  // Sync with URL param changes (e.g. back button)
  useEffect(() => {
    setActiveTab((initialTab as TabKey) ?? "overview");
  }, [initialTab]);

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 18,
        borderBottom: "1px solid rgba(148,163,184,0.14)",
        paddingBottom: 12,
      }}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`pill${activeTab === key ? " pill--gold" : ""}`}
          style={{ fontSize: "0.82rem" }}
          onClick={() => switchTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export { TABS };
export type { TabKey };