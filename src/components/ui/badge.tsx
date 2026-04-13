import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary",
        secondary:
          "border-border bg-white/8 text-foreground/95 font-bold",
        outline:
          "border-border/80 bg-background text-foreground font-bold",
        success:
          "border-emerald-400/40 bg-emerald-400/18 text-emerald-600 font-bold",
        warning:
          "border-amber-400/40 bg-amber-300/18 text-amber-700 font-bold",
        destructive:
          "border-red-400/40 bg-red-300/18 text-red-600 font-bold",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };