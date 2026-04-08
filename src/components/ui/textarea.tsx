import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full rounded-xl border border-[#EFBF04] bg-[#76B3F4] px-4 py-3 text-sm text-foreground shadow-sm transition placeholder:text-slate-700/80 focus:border-[#EFBF04] focus:outline-none focus:ring-4 focus:ring-[#EFBF04]/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };