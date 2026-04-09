import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/15 text-primary",
        secondary:
          "border-border bg-white/5 text-foreground/85",
        outline: "border-border bg-background text-foreground/85",
        success: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200",
        warning: "border-amber-300/30 bg-amber-300/15 text-amber-200",
        destructive: "border-red-300/30 bg-red-300/15 text-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };