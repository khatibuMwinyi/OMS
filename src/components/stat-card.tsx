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
      <CardContent className="px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-detail hidden sm:block">{detail}</div>
          </div>
          {Icon ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-10 sm:w-10">
              <Icon size={16} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
