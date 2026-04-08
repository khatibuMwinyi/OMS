import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#EFBF04] bg-[#76B3F4] px-4 py-2.5 text-sm text-foreground shadow-sm transition placeholder:text-slate-700/80 focus:border-[#EFBF04] focus:outline-none focus:ring-4 focus:ring-[#EFBF04]/25 disabled:cursor-not-allowed disabled:opacity-50",
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