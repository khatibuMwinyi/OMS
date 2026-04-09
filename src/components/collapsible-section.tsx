"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type CollapsibleSectionProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

export function CollapsibleSection({
  title,
  eyebrow,
  children,
  defaultOpen = false,
  onOpenChange,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  return (
    <section className="space-y-4">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-5 py-4 transition hover:bg-white/10"
      >
        <div className="text-left">
          {eyebrow && <span className="eyebrow block">{eyebrow}</span>}
          <h2 className="section-title">{title}</h2>
        </div>
        <ChevronDown
          size={20}
          className={`text-foreground/75 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && <div>{children}</div>}
    </section>
  );
}
