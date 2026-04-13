"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type DashboardModule = {
  key: string;
  label: string;
};

type DashboardModuleToggleProps = {
  modules: DashboardModule[];
  defaultModule?: string;
};

export function DashboardModuleToggle({
  modules,
  defaultModule = "invoices",
}: DashboardModuleToggleProps) {
  const [selectedModule, setSelectedModule] = useState(defaultModule);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(
      "[data-dashboard-module]",
    );

    sections.forEach((section) => {
      if (section.dataset.dashboardModule === selectedModule) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });
  }, [selectedModule]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {modules.map((module) => (
          <Button
            key={module.key}
            variant={selectedModule === module.key ? "default" : "secondary"}
            size="sm"
            className="w-full text-sm"
            onClick={() => setSelectedModule(module.key)}
          >
            {module.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
