import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="stat-card">
      <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        <div className="flex items-start justify-between gap-3 sm:gap-5">
          <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-detail">{detail}</div>
          </div>
          {Icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-11 sm:w-11">
              <Icon size={16} className="sm:hidden" />
              <Icon size={18} className="hidden sm:block" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
