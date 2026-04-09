import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RecordFieldRowProps = {
  label: string;
  helper?: string;
  children: ReactNode;
  className?: string;
};

export function RecordFieldRow({
  label,
  helper,
  children,
  className,
}: RecordFieldRowProps) {
  return (
    <div
      className={cn(
        "grid gap-4 border-b border-border/85 px-5 py-4 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start",
        className,
      )}
    >
      <div>
        <span className="record-field-label">{label}</span>
        {helper ? <p className="record-field-helper">{helper}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
