import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ModuleCardProps = {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
};

export function ModuleCard({
  title,
  description,
  badge,
  icon: Icon,
}: ModuleCardProps) {
  return (
    <Card className="module-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-lift">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <Badge className="module-badge" variant="default">
            <Icon size={14} />
            {badge}
          </Badge>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon size={18} />
          </div>
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
      </CardContent>
    </Card>
  );
}
