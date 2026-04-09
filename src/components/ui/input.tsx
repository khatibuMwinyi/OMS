import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-xl border border-primary/25 bg-card/75 px-4 py-2.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        suppressHydrationWarning
        type={type}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };