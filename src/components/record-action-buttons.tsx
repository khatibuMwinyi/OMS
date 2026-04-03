"use client";

import Link from "next/link";
import { Download, Eye, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type RecordActionButtonsProps = {
  shareHref?: string | null;
  editHref?: string | null;
  previewHref?: string | null;
  downloadHref?: string | null;
};

function actionButtonClassName() {
  return "h-9 w-9 rounded-xl border border-border bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/5 hover:text-primary";
}

export function RecordActionButtons({
  shareHref,
  editHref,
  previewHref,
  downloadHref,
}: RecordActionButtonsProps) {
  return (
    <div className="inline-flex items-center justify-end gap-2">
      {shareHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <a
            href={shareHref}
            aria-label="Share via WhatsApp"
            rel="noreferrer"
            target="_blank"
            title="Share via WhatsApp"
          >
            <Share2 size={14} />
          </a>
        </Button>
      ) : null}

      {editHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <Link href={editHref} aria-label="Edit record" title="Edit record">
            <Pencil size={14} />
          </Link>
        </Button>
      ) : null}

      {previewHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <a
            href={previewHref}
            aria-label="Preview PDF"
            rel="noreferrer"
            target="_blank"
            title="Preview PDF"
          >
            <Eye size={14} />
          </a>
        </Button>
      ) : null}

      {downloadHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <a
            href={downloadHref}
            download
            aria-label="Download PDF"
            title="Download PDF"
            onClick={() => toast.info("Preparing download...")}
          >
            <Download size={14} />
          </a>
        </Button>
      ) : null}
    </div>
  );
}
