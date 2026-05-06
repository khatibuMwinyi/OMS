"use client";

import type { ReactNode } from "react";

type ConfirmSubmitProps = {
  message: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
  children: ReactNode;
};

export function ConfirmSubmit({
  message,
  className,
  ariaLabel,
  title,
  children,
}: ConfirmSubmitProps) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      title={title}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
